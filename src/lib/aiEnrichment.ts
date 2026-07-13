import type { AlbumEntry } from '../types/album';

interface AiEnrichmentResult {
  Genre: string;
  ReleaseYear: number;
  Length: string;
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

  // 1. Fetch iTunes Data
  try {
    const res = await fetch(itunesUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Filter out singles and EPs, try to find a full album
        let top = data.results.find((r: any) => 
          r.trackCount > 3 && 
          !r.collectionName.toLowerCase().includes('- single') &&
          !r.collectionName.toLowerCase().includes('- ep')
        );
        
        // Fallback to the first result if we couldn't find a full album
        if (!top) {
          top = data.results[0];
        }

        coverArt = top.artworkUrl100?.replace('100x100bb', '600x600bb') || '';
        appleMusicLink = top.collectionViewUrl || '';
        trackCount = top.trackCount || 0;
        exactReleaseDate = top.releaseDate ? top.releaseDate.substring(0, 10) : '';
      }
    }
  } catch (err) {
    console.error('Failed to fetch from iTunes', err);
  }

  // 2. Fetch Gemini Data
  let aiData: AiEnrichmentResult = {
    Genre: 'TBD',
    ReleaseYear: exactReleaseDate ? parseInt(exactReleaseDate.substring(0, 4)) : new Date().getFullYear(),
    Length: '00:00:00',
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is missing in environment variables.');
  }

  const prompt = `You are a music metadata expert. I need data for the album "${albumName}" by "${artistName}".
Return ONLY a valid JSON object with the following keys exactly as written, and no markdown formatting or backticks:
"Genre": A string of 1 to 3 main genres separated by commas (e.g. "Progressive Rock, Psychedelic Rock").
"ReleaseYear": The 4-digit release year (number).
"Length": The total runtime of the album formatted exactly as "HH:MM:SS" (e.g. "00:42:50").

JSON:`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2
        }
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean up markdown just in case
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.Genre) aiData.Genre = parsed.Genre;
      if (parsed.ReleaseYear) aiData.ReleaseYear = parsed.ReleaseYear;
      if (parsed.Length) aiData.Length = parsed.Length;
    } else {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${res.statusText} - ${errObj.error?.message || ''}`);
    }
  } catch (err) {
    console.error('Failed to fetch from Gemini', err);
    throw new Error('Failed to research album metadata via AI. Check your API key and connection.');
  }

  return {
    Album: albumName,
    Artist: artistName,
    Rating: rating,
    Genre: aiData.Genre,
    "Release Year": aiData.ReleaseYear,
    Length: aiData.Length,
    CoverArt: coverArt,
    AppleMusicLink: appleMusicLink,
    TrackCount: trackCount,
    ExactReleaseDate: exactReleaseDate,
  };
}
