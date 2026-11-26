export interface ItunesArtist {
  artistId: number;
  artistName: string;
  primaryGenreName?: string;
}

export interface ItunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  collectionViewUrl: string;
  trackCount: number;
  releaseDate: string;
  primaryGenreName?: string;
  collectionType?: string;
  wrapperType?: string;
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

/** Upgrades an iTunes 100x100 artwork URL to a higher resolution. */
export function upgradeArtworkUrl(url: string | undefined, size = 600): string {
  if (!url) return '';
  return url.replace('100x100bb', `${size}x${size}bb`);
}

/** Returns true if an iTunes collection looks like a Single or EP rather than a full album. */
export function isSingleOrEp(album: ItunesAlbum): boolean {
  const lower = album.collectionName.toLowerCase();
  return (
    album.trackCount <= 3 ||
    lower.endsWith(' - single') ||
    lower.endsWith(' - ep')
  );
}

/** Searches iTunes for matching music artists. */
export async function searchItunesArtists(
  query: string,
  signal?: AbortSignal
): Promise<ItunesArtist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    trimmed
  )}&entity=musicArtist&limit=6`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('Failed to search artists on iTunes');
  }

  const data = await res.json();
  return (data.results || []).filter(
    (r: ItunesArtist) => Boolean(r.artistId && r.artistName)
  );
}

/** Fetches all albums for a given iTunes artist ID, sorted newest-first. */
export async function fetchArtistAlbums(
  artistId: number,
  signal?: AbortSignal
): Promise<ItunesAlbum[]> {
  const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('Failed to load artist discography from iTunes');
  }

  const data = await res.json();
  const albums: ItunesAlbum[] = (data.results || []).filter(
    (r: ItunesAlbum) =>
      r.wrapperType === 'collection' &&
      (!r.collectionType || r.collectionType === 'Album') &&
      Boolean(r.collectionId && r.collectionName)
  );

  // Deduplicate exact collectionIds and sort newest-first
  const seen = new Set<number>();
  const unique = albums.filter((a) => {
    if (seen.has(a.collectionId)) return false;
    seen.add(a.collectionId);
    return true;
  });

  unique.sort((a, b) => {
    const da = a.releaseDate ? Date.parse(a.releaseDate) : 0;
    const db = b.releaseDate ? Date.parse(b.releaseDate) : 0;
    return db - da;
  });

  return unique;
}

/** Searches iTunes for matching albums by album name. */
export async function searchItunesAlbums(
  query: string,
  signal?: AbortSignal
): Promise<ItunesAlbum[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    trimmed
  )}&entity=album&limit=40`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('Failed to search albums on iTunes');
  }

  const data = await res.json();
  const albums: ItunesAlbum[] = (data.results || []).filter(
    (r: ItunesAlbum) =>
      r.wrapperType === 'collection' &&
      (!r.collectionType || r.collectionType === 'Album') &&
      Boolean(r.collectionId && r.collectionName)
  );

  const seen = new Set<number>();
  return albums.filter((a) => {
    if (seen.has(a.collectionId)) return false;
    seen.add(a.collectionId);
    return true;
  });
}

/** Searches iTunes for a single best-matching studio album. */
export async function searchItunesAlbum(
  albumName: string,
  artistName: string
): Promise<ItunesAlbum | null> {
  const query = encodeURIComponent(`${albumName} ${artistName}`);
  const res = await fetch(
    `https://itunes.apple.com/search?term=${query}&entity=album&limit=15`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const results: ItunesAlbum[] = data.results || [];
  if (results.length === 0) return null;

  return results.find((r) => !isSingleOrEp(r)) || results[0];
}

/** Fetches the total runtime (HH:MM:SS) of an iTunes album by its collectionId. */
export async function fetchItunesAlbumLength(
  collectionId: number
): Promise<string | undefined> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`
  );
  if (!res.ok) return undefined;

  const data = await res.json();
  if (!data.results || data.results.length <= 1) return undefined;

  const songs = data.results.filter((r: { wrapperType?: string }) => r.wrapperType === 'track');
  const totalMs = songs.reduce(
    (sum: number, song: { trackTimeMillis?: number }) => sum + (song.trackTimeMillis || 0),
    0
  );
  return totalMs > 0 ? formatMsToHMS(totalMs) : undefined;
}
