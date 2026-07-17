import type { AlbumEntry } from '../types/album';

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
  const apiKey = localStorage.getItem('GEMINI_API_KEY');

  if (apiKey) {
    const prompt = `You are a music metadata expert. I need genres for the album "${albumName}" by "${artistName}".
Return ONLY a string of 1 to 3 main genres separated by commas (e.g. "Progressive Rock, Psychedelic Rock"). Do not use markdown.
Genres:`;

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
    console.warn('GEMINI_API_KEY missing from Admin Settings, using iTunes primary genre fallback.');
  }

  return {
    Album: albumName,
    Artist: artistName,
    Rating: rating,
    Genre: genres,
    "Release Year": exactReleaseDate ? parseInt(exactReleaseDate.substring(0, 4)) : new Date().getFullYear(),
    Length: calculatedLength,
    CoverArt: coverArt,
    AppleMusicLink: appleMusicLink,
    TrackCount: trackCount,
    ExactReleaseDate: exactReleaseDate,
  };
}
