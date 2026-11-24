import type { AlbumEntry } from '../types/album';
import { validateAndFixAlbumMetadata } from './albumMetadata';
import {
  GEMINI_CANDIDATE_MODELS,
  getEffectiveGeminiApiKey,
  callGeminiWithFallback,
} from './gemini';
import {
  type ItunesAlbum,
  searchItunesAlbum,
  fetchItunesAlbumLength,
  upgradeArtworkUrl,
} from './itunes';

export { GEMINI_CANDIDATE_MODELS, getEffectiveGeminiApiKey };

export interface AlbumRecommendation {
  title: string;
  artist: string;
  reason: string;
}

/** Calls Gemini to get 3 album recommendations similar to the provided album. */
export async function getAlbumRecommendations(
  album: AlbumEntry,
  userCollection: AlbumEntry[] = [],
  customApiKey?: string
): Promise<AlbumRecommendation[]> {
  const collectionTitles = userCollection
    .slice(0, 30)
    .map((a) => `"${String(a.Album)}" by ${a.Artist}`)
    .join(', ');

  const prompt = `You are a music expert and recommendation engine.

Album: "${String(album.Album)}" by ${album.Artist}
Genre: ${album.Genre}
Release Year: ${album['Release Year']}
User Rating: ${album.Rating}/10

${collectionTitles ? `Albums already in user's collection (do NOT recommend these): ${collectionTitles}` : ''}

Recommend exactly 3 albums that fans of this album would enjoy. For each recommendation provide:
- A real, specific album title
- The correct artist name
- A concise 1-sentence reason why it fits

Return ONLY a valid JSON array in this exact format, no markdown, no extra text:
[{"title":"Album Name","artist":"Artist Name","reason":"One sentence reason."},...]`;

  const text = await callGeminiWithFallback(prompt, {
    customApiKey,
    temperature: 0.7,
    maxOutputTokens: 1024,
  });

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonStart = cleaned.indexOf('[');
  const jsonEnd = cleaned.lastIndexOf(']');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as AlbumRecommendation[];
  }

  throw new Error('Failed to parse recommendations from Gemini response.');
}

/**
 * Enriches an album entry with iTunes metadata, exact track length, Gemini genres,
 * and MusicBrainz/Gemini fallbacks. If `preselectedAlbum` is provided (from the
 * visual artist browser), skips the fuzzy iTunes search and uses its exact collectionId.
 */
export async function enrichAlbumData(
  albumName: string,
  artistName: string,
  rating: number,
  preselectedAlbum?: ItunesAlbum
): Promise<AlbumEntry> {
  let matchedAlbum: ItunesAlbum | null = preselectedAlbum ?? null;

  if (!matchedAlbum) {
    try {
      matchedAlbum = await searchItunesAlbum(albumName, artistName);
    } catch (err) {
      console.error('Failed to fetch from iTunes', err);
    }
  }

  const coverArt = upgradeArtworkUrl(matchedAlbum?.artworkUrl100, 600);
  const appleMusicLink = matchedAlbum?.collectionViewUrl || '';
  let trackCount = matchedAlbum?.trackCount || 0;
  const exactReleaseDate = matchedAlbum?.releaseDate
    ? matchedAlbum.releaseDate.substring(0, 10)
    : '';
  const primaryGenre = matchedAlbum?.primaryGenreName || 'TBD';
  let calculatedLength = '00:00:00';

  // Fetch exact total length from iTunes tracks lookup
  if (matchedAlbum?.collectionId) {
    try {
      const length = await fetchItunesAlbumLength(matchedAlbum.collectionId);
      if (length) calculatedLength = length;
    } catch (err) {
      console.error('Failed to fetch tracks from iTunes', err);
    }
  }

  // Fetch richer genres via Gemini if an API key is available
  let genres = primaryGenre;
  if (getEffectiveGeminiApiKey()) {
    const prompt = `You are a music metadata expert. I need genres for the album "${albumName}" by "${artistName}".
Return ONLY a string of 1 to 3 main genres separated by commas (e.g. "Progressive Rock, Psychedelic Rock"). Do not use markdown.
Genres:`;

    try {
      const text = await callGeminiWithFallback(prompt, { temperature: 0.2 });
      const cleaned = text.trim();
      if (cleaned && !cleaned.includes('{') && !cleaned.includes('```')) {
        genres = cleaned;
      }
    } catch (err) {
      console.warn('Gemini genre lookup failed, using iTunes primary genre:', err);
    }
  }

  // Validate & fallback for track count / length / year
  let releaseYear = exactReleaseDate
    ? parseInt(exactReleaseDate.substring(0, 4))
    : new Date().getFullYear();

  try {
    const validated = await validateAndFixAlbumMetadata(
      albumName,
      artistName,
      trackCount,
      calculatedLength,
      releaseYear
    );
    trackCount = validated.trackCount;
    calculatedLength = validated.length;
    releaseYear = validated.releaseYear;
  } catch (fallbackErr) {
    console.warn('Fallback validation failed:', fallbackErr);
  }

  return {
    Album: albumName,
    Artist: artistName,
    Rating: rating,
    Genre: genres,
    'Release Year': releaseYear,
    Length: calculatedLength,
    CoverArt: coverArt,
    AppleMusicLink: appleMusicLink,
    TrackCount: trackCount,
    ExactReleaseDate: exactReleaseDate,
  };
}
