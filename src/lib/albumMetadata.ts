export interface MetadataFallbackResult {
  trackCount?: number;
  length?: string; // HH:MM:SS format
  releaseYear?: number;
  source: 'musicbrainz' | 'itunes' | 'gemini' | 'wikipedia' | 'none';
  sourceLabel?: string;
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
 * 1. Queries MusicBrainz API for standard LP release track count and total length.
 */
export async function fetchMusicBrainzMetadata(
  albumName: string,
  artistName: string
): Promise<MetadataFallbackResult> {
  try {
    const cleanAlbum = encodeURIComponent(albumName.trim());
    const cleanArtist = encodeURIComponent(artistName.trim());

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

    const releasesUrl = `https://musicbrainz.org/ws/2/release/?release-group=${rgId}&inc=recordings&fmt=json`;
    const releasesRes = await fetch(releasesUrl, {
      headers: {
        'User-Agent': 'PersonalWebsiteAlbumIntake/1.0 ( https://github.com )',
      },
    });

    if (!releasesRes.ok) {
      return { releaseYear, source: 'musicbrainz', sourceLabel: 'MusicBrainz' };
    }

    const releasesData = await releasesRes.json();
    const releases = releasesData.releases || [];
    if (releases.length === 0) {
      return { releaseYear, source: 'musicbrainz', sourceLabel: 'MusicBrainz' };
    }

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
      sourceLabel: 'MusicBrainz',
    };
  } catch (err) {
    console.warn('MusicBrainz fetch failed:', err);
    return { source: 'none' };
  }
}

/**
 * 2. Queries iTunes Search API for alternative collection match & track durations.
 */
export async function fetchItunesMetadata(
  albumName: string,
  artistName: string
): Promise<MetadataFallbackResult> {
  try {
    const query = encodeURIComponent(`${albumName} ${artistName}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=10`);
    if (!res.ok) return { source: 'none' };

    const data = await res.json();
    if (!data.results || data.results.length === 0) return { source: 'none' };

    // Select standard studio album
    const top = data.results.find((r: any) =>
      r.trackCount > 3 &&
      !r.collectionName.toLowerCase().includes('- single') &&
      !r.collectionName.toLowerCase().includes('- ep')
    ) || data.results[0];

    const trackCount = top.trackCount || 0;
    const releaseYear = top.releaseDate ? parseInt(top.releaseDate.substring(0, 4)) : undefined;
    let calculatedLength: string | undefined = undefined;

    if (top.collectionId) {
      const tracksRes = await fetch(`https://itunes.apple.com/lookup?id=${top.collectionId}&entity=song`);
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        if (tracksData.results && tracksData.results.length > 1) {
          const songs = tracksData.results.filter((r: any) => r.wrapperType === 'track');
          const totalMs = songs.reduce((sum: number, song: any) => sum + (song.trackTimeMillis || 0), 0);
          if (totalMs > 0) calculatedLength = formatMsToHMS(totalMs);
        }
      }
    }

    return {
      trackCount: trackCount > 0 ? trackCount : undefined,
      length: calculatedLength,
      releaseYear,
      source: 'itunes',
      sourceLabel: 'iTunes Search',
    };
  } catch (err) {
    console.warn('iTunes fetch failed:', err);
    return { source: 'none' };
  }
}

/** 
 * 3. Prompts Gemini AI to return standard original studio album length and track count.
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

Return ONLY info for the STANDARD ORIGINAL STUDIO RELEASE (no deluxe bonus tracks, live tracks, or commentary).

Return ONLY a JSON object in this exact format:
{"trackCount": 10, "length": "00:42:15", "releaseYear": 1973}`;

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of candidateModels) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        trackCount: typeof parsed.trackCount === 'number' && parsed.trackCount > 0 ? parsed.trackCount : undefined,
        length: typeof parsed.length === 'string' && parsed.length.includes(':') ? parsed.length : undefined,
        releaseYear: typeof parsed.releaseYear === 'number' ? parsed.releaseYear : undefined,
        source: 'gemini',
        sourceLabel: 'Gemini AI',
      };
    } catch {
      continue;
    }
  }

  return { source: 'none' };
}

/**
 * 4. Queries Wikipedia REST API / MediaWiki API for album metadata.
 */
export async function fetchWikipediaMetadata(
  albumName: string,
  artistName: string
): Promise<MetadataFallbackResult> {
  try {
    const title = `${albumName} (${artistName} album)`;
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return { source: 'none' };

    const data = await res.json();
    const extract = data.extract || '';

    // Search extract text for release year
    const yearMatch = extract.match(/\b(19\d\d|20\d\d)\b/);
    const releaseYear = yearMatch ? parseInt(yearMatch[1]) : undefined;

    return {
      releaseYear,
      source: 'wikipedia',
      sourceLabel: 'Wikipedia REST API',
    };
  } catch (err) {
    console.warn('Wikipedia fetch failed:', err);
    return { source: 'none' };
  }
}

export const CYCLE_SOURCES = [
  { name: 'MusicBrainz', fetcher: fetchMusicBrainzMetadata },
  { name: 'iTunes API', fetcher: fetchItunesMetadata },
  { name: 'Gemini AI', fetcher: fetchGeminiMetadataFallback },
  { name: 'Wikipedia API', fetcher: fetchWikipediaMetadata },
];

/**
 * Cycles sequentially through metadata databases on each call.
 */
export async function cycleAlbumMetadata(
  albumName: string,
  artistName: string,
  currentIndex: number
): Promise<MetadataFallbackResult & { nextIndex: number }> {
  const totalSources = CYCLE_SOURCES.length;
  let nextIndex = (currentIndex + 1) % totalSources;

  for (let i = 0; i < totalSources; i++) {
    const sourceIdx = (currentIndex + i) % totalSources;
    const source = CYCLE_SOURCES[sourceIdx];
    const res = await source.fetcher(albumName, artistName);

    if (res.length || res.trackCount || res.releaseYear) {
      return {
        ...res,
        sourceLabel: source.name,
        nextIndex: (sourceIdx + 1) % totalSources,
      };
    }
  }

  return {
    source: 'none',
    sourceLabel: 'No alternative found',
    nextIndex,
  };
}

/**
 * Validates album metadata and applies fallbacks automatically during initial enrichment.
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
