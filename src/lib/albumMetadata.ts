export interface MetadataFallbackResult {
  trackCount?: number;
  length?: string; // HH:MM:SS format
  releaseYear?: number;
  source: 'musicbrainz' | 'gemini' | 'wikipedia' | 'none';
}

/** Formats milliseconds into HH:MM:SS */
export function formatMsToHMS(ms: number): string {
  if (!ms || ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

/** 
 * Queries MusicBrainz API for standard LP release track count and total length.
 * MusicBrainz does not require an API key, but requires a custom User-Agent.
 */
export async function fetchMusicBrainzMetadata(
  albumName: string,
  artistName: string
): Promise<MetadataFallbackResult> {
  try {
    const cleanAlbum = encodeURIComponent(albumName.trim());
    const cleanArtist = encodeURIComponent(artistName.trim());

    // 1. Search for release group (Album type)
    const searchUrl = `https://musicbrainz.org/ws/2/release-group/?query=releasegroup:"${cleanAlbum}" AND artist:"${cleanArtist}"&fmt=json`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'PersonalWebsiteAlbumIntake/1.0 ( https://github.com )',
      },
    });

    if (!searchRes.ok) {
      return { source: 'none' };
    }

    const searchData = await searchRes.json();
    const releaseGroups = searchData['release-groups'] || [];
    if (releaseGroups.length === 0) {
      return { source: 'none' };
    }

    // Find primary "Album" type (avoid live/compilation if possible)
    let targetGroup = releaseGroups.find(
      (rg: any) =>
        rg['primary-type'] === 'Album' &&
        (!rg['secondary-types'] || rg['secondary-types'].length === 0)
    );

    if (!targetGroup) {
      targetGroup = releaseGroups[0];
    }

    const rgId = targetGroup.id;
    const releaseYear = targetGroup['first-release-date']
      ? parseInt(targetGroup['first-release-date'].substring(0, 4))
      : undefined;

    // 2. Fetch official releases under this release group to get track duration & count
    const releasesUrl = `https://musicbrainz.org/ws/2/release/?release-group=${rgId}&inc=recordings&fmt=json`;
    const releasesRes = await fetch(releasesUrl, {
      headers: {
        'User-Agent': 'PersonalWebsiteAlbumIntake/1.0 ( https://github.com )',
      },
    });

    if (!releasesRes.ok) {
      return { releaseYear, source: 'musicbrainz' };
    }

    const releasesData = await releasesRes.json();
    const releases = releasesData.releases || [];
    if (releases.length === 0) {
      return { releaseYear, source: 'musicbrainz' };
    }

    // Prefer official digital or CD releases with valid media/tracks
    let bestRelease = releases.find(
      (r: any) => r.status === 'Official' && r.media && r.media.length > 0
    );
    if (!bestRelease) bestRelease = releases[0];

    let totalMs = 0;
    let trackCount = 0;

    if (bestRelease.media) {
      for (const media of bestRelease.media) {
        trackCount += media['track-count'] || media.tracks?.length || 0;
        if (media.tracks) {
          for (const tr of media.tracks) {
            if (tr.length) {
              totalMs += tr.length;
            } else if (tr.recording && tr.recording.length) {
              totalMs += tr.recording.length;
            }
          }
        }
      }
    }

    const formattedLength = totalMs > 0 ? formatMsToHMS(totalMs) : undefined;

    return {
      trackCount: trackCount > 0 ? trackCount : undefined,
      length: formattedLength,
      releaseYear,
      source: 'musicbrainz',
    };
  } catch (err) {
    console.warn('MusicBrainz metadata fallback fetch failed:', err);
    return { source: 'none' };
  }
}

/** 
 * Prompts Gemini AI to return standard original studio album length and track count 
 * when APIs return ambiguous or bloated Deluxe Edition metadata.
 */
export async function fetchGeminiMetadataFallback(
  albumName: string,
  artistName: string
): Promise<MetadataFallbackResult> {
  const apiKey =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    localStorage.getItem('GEMINI_API_KEY');

  if (!apiKey) return { source: 'none' };

  const prompt = `You are a music metadata expert. Provide the exact standard studio album track count and runtime for:
Album: "${albumName}"
Artist: "${artistName}"

Note: Return info for the STANDARD ORIGINAL STUDIO RELEASE only (do NOT include deluxe bonus tracks, live tracks, commentary, or anniversary bonus disks).

Return ONLY a JSON object in this exact format:
{"trackCount": 10, "length": "00:42:15", "releaseYear": 1973}
If unknown, set values to null.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!res.ok) return { source: 'none' };

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      trackCount: typeof parsed.trackCount === 'number' && parsed.trackCount > 0 ? parsed.trackCount : undefined,
      length: typeof parsed.length === 'string' && parsed.length.includes(':') ? parsed.length : undefined,
      releaseYear: typeof parsed.releaseYear === 'number' ? parsed.releaseYear : undefined,
      source: 'gemini',
    };
  } catch (err) {
    console.warn('Gemini metadata fallback fetch failed:', err);
    return { source: 'none' };
  }
}

/**
 * Validates album metadata and applies fallbacks if iTunes data is missing,
 * has 0 tracks, or appears inflated (>25 tracks or >2.5 hours length).
 */
export async function validateAndFixAlbumMetadata(
  albumName: string,
  artistName: string,
  currentTrackCount: number,
  currentLength: string,
  currentYear: number
): Promise<{
  trackCount: number;
  length: string;
  releaseYear: number;
  fallbackUsed: boolean;
  source: string;
}> {
  let isSuspicious = false;

  // Check if iTunes metadata looks missing or bloated
  if (!currentTrackCount || currentTrackCount === 0 || currentTrackCount > 25) {
    isSuspicious = true;
  }

  if (!currentLength || currentLength === '00:00:00' || currentLength.startsWith('03:') || currentLength.startsWith('04:')) {
    isSuspicious = true;
  }

  if (!isSuspicious) {
    return {
      trackCount: currentTrackCount,
      length: currentLength,
      releaseYear: currentYear,
      fallbackUsed: false,
      source: 'itunes',
    };
  }

  // 1. Try MusicBrainz
  const mbResult = await fetchMusicBrainzMetadata(albumName, artistName);
  let finalTrackCount = mbResult.trackCount ?? currentTrackCount;
  let finalLength = mbResult.length ?? currentLength;
  let finalYear = mbResult.releaseYear ?? currentYear;

  if (mbResult.trackCount || (mbResult.length && mbResult.length !== '00:00:00')) {
    return {
      trackCount: finalTrackCount,
      length: finalLength,
      releaseYear: finalYear,
      fallbackUsed: true,
      source: 'musicbrainz',
    };
  }

  // 2. Try Gemini AI fallback
  const geminiResult = await fetchGeminiMetadataFallback(albumName, artistName);
  if (geminiResult.trackCount) finalTrackCount = geminiResult.trackCount;
  if (geminiResult.length && geminiResult.length !== '00:00:00') finalLength = geminiResult.length;
  if (geminiResult.releaseYear) finalYear = geminiResult.releaseYear;

  return {
    trackCount: finalTrackCount,
    length: finalLength,
    releaseYear: finalYear,
    fallbackUsed: geminiResult.source !== 'none',
    source: geminiResult.source !== 'none' ? 'gemini' : 'itunes',
  };
}
