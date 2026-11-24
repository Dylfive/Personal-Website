import { callGeminiWithFallback } from './gemini';
import {
  formatMsToHMS,
  searchItunesAlbum,
  fetchItunesAlbumLength,
} from './itunes';

export { formatMsToHMS };

export interface MetadataFallbackResult {
  trackCount?: number;
  length?: string; // HH:MM:SS format
  releaseYear?: number;
  source: 'musicbrainz' | 'itunes' | 'gemini' | 'wikipedia' | 'none';
  sourceLabel?: string;
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

    interface MusicBrainzReleaseGroup {
      id: string;
      'primary-type'?: string;
      'secondary-types'?: string[];
      'first-release-date'?: string;
    }

    let targetGroup = (releaseGroups as MusicBrainzReleaseGroup[]).find(
      (rg) =>
        rg['primary-type'] === 'Album' &&
        (!rg['secondary-types'] || rg['secondary-types'].length === 0)
    );

    if (!targetGroup) {
      targetGroup = releaseGroups[0] as MusicBrainzReleaseGroup;
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

    interface MusicBrainzRelease {
      status?: string;
      media?: Array<{
        'track-count'?: number;
        tracks?: Array<{ length?: number; recording?: { length?: number } }>;
      }>;
    }

    let bestRelease = (releases as MusicBrainzRelease[]).find(
      (r) => r.status === 'Official' && r.media && r.media.length > 0
    );
    if (!bestRelease) bestRelease = releases[0] as MusicBrainzRelease;

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
    const top = await searchItunesAlbum(albumName, artistName);
    if (!top) return { source: 'none' };

    const trackCount = top.trackCount || 0;
    const releaseYear = top.releaseDate ? parseInt(top.releaseDate.substring(0, 4)) : undefined;
    const calculatedLength = top.collectionId
      ? await fetchItunesAlbumLength(top.collectionId)
      : undefined;

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
  const prompt = `You are a music metadata expert. Provide the exact standard studio album track count and runtime for:
Album: "${albumName}"
Artist: "${artistName}"

Return ONLY info for the STANDARD ORIGINAL STUDIO RELEASE (no deluxe bonus tracks, live tracks, or commentary).

Return ONLY a JSON object in this exact format:
{"trackCount": 10, "length": "00:42:15", "releaseYear": 1973}`;

  try {
    const text = await callGeminiWithFallback(prompt, { temperature: 0.1 });
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      trackCount: typeof parsed.trackCount === 'number' && parsed.trackCount > 0 ? parsed.trackCount : undefined,
      length: typeof parsed.length === 'string' && parsed.length.includes(':') ? parsed.length : undefined,
      releaseYear: typeof parsed.releaseYear === 'number' ? parsed.releaseYear : undefined,
      source: 'gemini',
      sourceLabel: 'Gemini AI',
    };
  } catch (err) {
    if (err instanceof Error && (err.message === 'NO_API_KEY' || err.message.includes('API key') || err.message.includes('API_KEY'))) {
      if (err.message === 'NO_API_KEY') return { source: 'none' };
      throw err;
    }
    return { source: 'none' };
  }
}

/**
 * 4. Queries Wikipedia REST API for album release year.
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
  const nextIndex = (currentIndex + 1) % totalSources;

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
  const isSuspicious =
    !currentTrackCount ||
    currentTrackCount === 0 ||
    currentTrackCount > 25 ||
    !currentLength ||
    currentLength === '00:00:00' ||
    currentLength.startsWith('03:') ||
    currentLength.startsWith('04:');

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
