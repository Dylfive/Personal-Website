import type { AlbumEntry } from '../types/album';
import { validateAndFixAlbumMetadata } from './albumMetadata';

export interface AlbumRecommendation {
  title: string;
  artist: string;
  reason: string;
}

/** Calls Gemini to get 3 album recommendations similar to the provided album. */
export async function getAlbumRecommendations(
  album: AlbumEntry,
  userCollection: AlbumEntry[] = []
): Promise<AlbumRecommendation[]> {
  const apiKey =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    localStorage.getItem('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

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

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.statusText}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip potential markdown code fences
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonStart = cleaned.indexOf('[');
  const jsonEnd = cleaned.lastIndexOf(']');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON array in response');

  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as AlbumRecommendation[];
}


function formatMillisecondsToHMS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

export async function enrichAlbumData(
  albumName: string,
  artistName: string,
  rating: number
): Promise<AlbumEntry> {
  const query = encodeURIComponent(`${albumName} ${artistName}`);
  const itunesUrl = `https://itunes.apple.com/search?term=${query}&entity=album&limit=15`;

  let coverArt = '';
  let appleMusicLink = '';
  let trackCount = 0;
  let exactReleaseDate = '';
  let collectionId = null;
  let primaryGenre = 'TBD';
  let calculatedLength = '00:00:00';

  // 1. Fetch iTunes Album Data
  try {
    const res = await fetch(itunesUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        let top = data.results.find((r: any) => 
          r.trackCount > 3 && 
          !r.collectionName.toLowerCase().includes('- single') &&
          !r.collectionName.toLowerCase().includes('- ep')
        );
        
        if (!top) {
          top = data.results[0];
        }

        coverArt = top.artworkUrl100?.replace('100x100bb', '600x600bb') || '';
        appleMusicLink = top.collectionViewUrl || '';
        trackCount = top.trackCount || 0;
        exactReleaseDate = top.releaseDate ? top.releaseDate.substring(0, 10) : '';
        collectionId = top.collectionId;
        if (top.primaryGenreName) primaryGenre = top.primaryGenreName;
      }
    }
  } catch (err) {
    console.error('Failed to fetch from iTunes', err);
  }

  // 2. Fetch iTunes Tracks Data for exact Length
  if (collectionId) {
    try {
      const tracksUrl = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`;
      const res = await fetch(tracksUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 1) {
          const songs = data.results.filter((r: any) => r.wrapperType === 'track');
          const totalMs = songs.reduce((sum: number, song: any) => sum + (song.trackTimeMillis || 0), 0);
          if (totalMs > 0) {
            calculatedLength = formatMillisecondsToHMS(totalMs);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch tracks from iTunes', err);
    }
  }

  // 3. Fetch Gemini Data for Genres
  let genres = primaryGenre;
  const apiKey =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    localStorage.getItem('GEMINI_API_KEY');

  if (apiKey) {
    const prompt = `You are a music metadata expert. I need genres for the album "${albumName}" by "${artistName}".
Return ONLY a string of 1 to 3 main genres separated by commas (e.g. "Progressive Rock, Psychedelic Rock"). Do not use markdown.
Genres:`;

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = text.trim();
        if (cleaned && !cleaned.includes('{') && !cleaned.includes('\`\`\`')) {
           genres = cleaned;
        }
      } else {
        console.warn('Gemini API returned an error:', res.statusText);
      }
    } catch (err) {
      console.error('Failed to fetch from Gemini', err);
    }
  } else {
    console.warn('GEMINI_API_KEY missing from settings/env, using iTunes primary genre fallback.');
  }

  // 4. Validate & Fallback check for Track Count and Total Length (MusicBrainz & Gemini)
  let releaseYear = exactReleaseDate ? parseInt(exactReleaseDate.substring(0, 4)) : new Date().getFullYear();
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
    "Release Year": releaseYear,
    Length: calculatedLength,
    CoverArt: coverArt,
    AppleMusicLink: appleMusicLink,
    TrackCount: trackCount,
    ExactReleaseDate: exactReleaseDate,
  };
}
