// albumStore.ts
// Per-user album management backed by Supabase & per-user local cache.
//
// ─── OWNER POLICY ────────────────────────────────────────────────────────────
// Only the owner account syncs album adds back to the GitHub repo (via the
// Supabase Edge Function). All other authenticated users store their data
// exclusively in Supabase's user_albums table.
//
// ─── FUTURE: AlbumWall Visual Gallery ────────────────────────────────────────
// Planned feature: a full-screen interactive wall where albums are arranged
// spatially by dominant cover colour (extracted at intake time via Canvas API
// or a server-side colour-extraction job). Users can drag, zoom, and rearrange
// albums. Dominant colour will be stored as a new `dominant_color` column in
// the user_albums table.

import type { AlbumEntry } from '../types/album';
import { supabase } from './supabase';
import rawAlbumData from '../data/Album-Data.json';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-album-api`;

/** Only this email address triggers the GitHub repo sync. */
const OWNER_EMAIL = 'dyl.gauvin@gmail.com';

// ─── Per-User Supabase / Storage Functions ────────────────────────────────────

export async function getUserAlbums(userId?: string): Promise<AlbumEntry[]> {
  if (!userId) {
    // Unauthenticated public showcase view: return default dataset
    return rawAlbumData as AlbumEntry[];
  }

  // 1. Try fetching from Supabase `user_albums` table
  try {
    const { data, error } = await supabase
      .from('user_albums')
      .select('*')
      .eq('user_id', userId)
      .order('rating', { ascending: false });

    if (!error && data) {
      if (data.length > 0) {
        const parsed: AlbumEntry[] = data.map((item: any) => ({
          Album: item.album,
          Artist: item.artist,
          Rating: Number(item.rating),
          Genre: item.genre,
          'Release Year': Number(item.release_year),
          Length: item.length,
          CoverArt: item.cover_art ?? '',
          AppleMusicLink: item.apple_music_link ?? '',
          TrackCount: item.track_count ?? 0,
          ExactReleaseDate: item.exact_release_date ?? '',
          RankOrder: item.rank_order !== undefined && item.rank_order !== null ? Number(item.rank_order) : undefined,
          IsHidden: item.is_hidden ?? false,
          TopSong: item.top_song ?? '',
        }));

        // Sort by Rating desc, then RankOrder asc (lower = better tiebreaker rank)
        parsed.sort((a, b) => {
          if (b.Rating !== a.Rating) return b.Rating - a.Rating;
          return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
        });

        // Cache to local storage
        localStorage.setItem(`albums_user_${userId}`, JSON.stringify(parsed));
        return parsed;
      } else {
        // Explicitly empty in Supabase
        const cached = localStorage.getItem(`albums_user_${userId}`);
        if (cached !== null) {
          return JSON.parse(cached);
        }
        return [];
      }
    }
  } catch (err) {
    console.warn('Supabase query error, checking local storage cache', err);
  }

  // 2. Local storage fallback per user
  const cached = localStorage.getItem(`albums_user_${userId}`);
  if (cached !== null) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  // Brand new user defaults to empty array
  return [];
}

export async function addUserAlbum(userId: string, newAlbum: AlbumEntry): Promise<AlbumEntry[]> {
  // 1. Insert into Supabase `user_albums` table
  try {
    const { error } = await supabase.from('user_albums').insert([
      {
        user_id: userId,
        album: String(newAlbum.Album),
        artist: newAlbum.Artist,
        rating: newAlbum.Rating,
        genre: newAlbum.Genre,
        release_year: newAlbum['Release Year'],
        length: newAlbum.Length,
        cover_art: newAlbum.CoverArt ?? '',
        apple_music_link: newAlbum.AppleMusicLink ?? '',
        track_count: newAlbum.TrackCount ?? 0,
        exact_release_date: newAlbum.ExactReleaseDate ?? '',
        rank_order: newAlbum.RankOrder ?? null,
        is_hidden: newAlbum.IsHidden ?? false,
        top_song: newAlbum.TopSong ?? '',
      },
    ]);
    if (error) {
      console.warn('Supabase insert warning:', error.message);
    }
  } catch (err) {
    console.warn('Supabase insert exception:', err);
  }

  // 2. Update local user storage
  const current = await getUserAlbums(userId);
  // Avoid duplicate by album name
  const filtered = current.filter(
    (a) => String(a.Album).toLowerCase().trim() !== String(newAlbum.Album).toLowerCase().trim()
  );
  const updated = [newAlbum, ...filtered].sort((a, b) => {
    if (b.Rating !== a.Rating) return b.Rating - a.Rating;
    return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
  });
  localStorage.setItem(`albums_user_${userId}`, JSON.stringify(updated));

  // GitHub sync — ONLY for the owner account to avoid polluting the portfolio repo
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser?.email === OWNER_EMAIL) {
    try {
      await callGitHubAPI({ action: 'append', album: newAlbum });
    } catch (err) {
      console.warn('GitHub Edge Function sync notice:', err);
    }
  }

  return updated;
}

export async function updateUserAlbum(
  userId: string,
  originalAlbumName: string,
  updatedAlbum: AlbumEntry
): Promise<AlbumEntry[]> {
  const normalizedOriginal = originalAlbumName.toLowerCase().trim();
  const normalizedNew = String(updatedAlbum.Album).toLowerCase().trim();

  try {
    // 1. Delete the original Supabase record
    await supabase
      .from('user_albums')
      .delete()
      .eq('user_id', userId)
      .ilike('album', originalAlbumName.trim());

    // 2. If the album name changed, also remove any conflicting record with the new name
    if (normalizedNew !== normalizedOriginal) {
      await supabase
        .from('user_albums')
        .delete()
        .eq('user_id', userId)
        .ilike('album', String(updatedAlbum.Album).trim());
    }

    // 3. Insert the updated record
    const { error } = await supabase.from('user_albums').insert([
      {
        user_id: userId,
        album: String(updatedAlbum.Album),
        artist: updatedAlbum.Artist,
        rating: updatedAlbum.Rating,
        genre: updatedAlbum.Genre,
        release_year: updatedAlbum['Release Year'],
        length: updatedAlbum.Length,
        cover_art: updatedAlbum.CoverArt ?? '',
        apple_music_link: updatedAlbum.AppleMusicLink ?? '',
        track_count: updatedAlbum.TrackCount ?? 0,
        exact_release_date: updatedAlbum.ExactReleaseDate ?? '',
        rank_order: updatedAlbum.RankOrder ?? null,
        is_hidden: updatedAlbum.IsHidden ?? false,
        top_song: updatedAlbum.TopSong ?? '',
      },
    ]);
    if (error) console.warn('Supabase update insert warning:', error.message);
  } catch (err) {
    console.warn('Supabase updateUserAlbum exception:', err);
  }

  // 4. Rebuild local cache: remove original + any name-conflict, prepend updated
  const current = await getUserAlbums(userId);
  const filtered = current.filter(
    (a) =>
      String(a.Album).toLowerCase().trim() !== normalizedOriginal &&
      String(a.Album).toLowerCase().trim() !== normalizedNew
  );
  const updated = [updatedAlbum, ...filtered].sort((a, b) => {
    if (b.Rating !== a.Rating) return b.Rating - a.Rating;
    return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
  });
  localStorage.setItem(`albums_user_${userId}`, JSON.stringify(updated));

  // 5. GitHub sync — owner only
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser?.email === OWNER_EMAIL) {
    try {
      await callGitHubAPI({ action: 'update', album: updatedAlbum, originalName: originalAlbumName });
    } catch (err) {
      console.warn('GitHub Edge Function sync notice:', err);
    }
  }

  return updated;
}

export async function seedUserAlbums(userId: string): Promise<AlbumEntry[]> {
  const seedData = rawAlbumData as AlbumEntry[];
  localStorage.setItem(`albums_user_${userId}`, JSON.stringify(seedData));

  try {
    const rows = seedData.map((a) => ({
      user_id: userId,
      album: String(a.Album),
      artist: a.Artist,
      rating: a.Rating,
      genre: a.Genre,
      release_year: a['Release Year'],
      length: a.Length,
      cover_art: a.CoverArt ?? '',
      apple_music_link: a.AppleMusicLink ?? '',
      track_count: a.TrackCount ?? 0,
      exact_release_date: a.ExactReleaseDate ?? '',
    }));
    await supabase.from('user_albums').insert(rows);
  } catch (err) {
    console.warn('Supabase batch insert error during seed:', err);
  }

  return seedData;
}

export async function clearUserAlbums(userId: string): Promise<void> {
  localStorage.setItem(`albums_user_${userId}`, JSON.stringify([]));
  try {
    await supabase.from('user_albums').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase delete error during clear:', err);
  }
}

// ─── Legacy GitHub API Helpers ────────────────────────────────────────────────

async function callGitHubAPI(body: Record<string, unknown>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  // Double-check: only proceed if the session belongs to the owner
  if (!session || session.user?.email !== OWNER_EMAIL) return;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    console.warn('GitHub API sync warning:', err.error);
  }
}

export async function fetchGitHubAlbums(): Promise<AlbumEntry[]> {
  try {
    const res = await fetch('https://raw.githubusercontent.com/Dylfive/Personal-Website/main/src/data/Album-Data.json');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch raw GitHub albums', err);
  }
  return rawAlbumData as AlbumEntry[];
}

export async function appendAlbumToGitHub(newAlbum: AlbumEntry): Promise<void> {
  await callGitHubAPI({ action: 'append', album: newAlbum });
}

export async function updateAlbumOnGitHub(
  originalName: string,
  updatedAlbum: AlbumEntry,
): Promise<void> {
  await callGitHubAPI({ action: 'update', album: updatedAlbum, originalName });
}

export async function deleteUserAlbum(userId: string, albumName: string): Promise<AlbumEntry[]> {
  const normalized = albumName.toLowerCase().trim();
  try {
    await supabase
      .from('user_albums')
      .delete()
      .eq('user_id', userId)
      .ilike('album', albumName.trim());
  } catch (err) {
    console.warn('Supabase deleteUserAlbum exception:', err);
  }

  const current = await getUserAlbums(userId);
  const updated = current.filter(
    (a) => String(a.Album).toLowerCase().trim() !== normalized
  );
  localStorage.setItem(`albums_user_${userId}`, JSON.stringify(updated));
  return updated;
}
