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
        }));

        // Sort by Rating desc, then RankOrder asc (lower = better tiebreaker rank)
        parsed.sort((a, b) => {
          if (b.Rating !== a.Rating) return b.Rating - a.Rating;
          return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
        });

        // Defensive dedupe: collapse any duplicate rows (same album) left behind
        // by older reorder writes — prefer the copy that carries a real rank.
        const uniqueByAlbum = new Map<string, AlbumEntry>();
        for (const a of parsed) {
          const k = String(a.Album).toLowerCase().trim();
          const prev = uniqueByAlbum.get(k);
          if (!prev) uniqueByAlbum.set(k, a);
          else if (prev.RankOrder === undefined && a.RankOrder !== undefined) uniqueByAlbum.set(k, a);
        }
        const deduped = [...uniqueByAlbum.values()].sort((a, b) => {
          if (b.Rating !== a.Rating) return b.Rating - a.Rating;
          return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
        });

        // Cache to local storage
        localStorage.setItem(`albums_user_${userId}`, JSON.stringify(deduped));
        return deduped;
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

  const record = {
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
  };

  try {
    if (normalizedNew === normalizedOriginal) {
      // Same-name update: atomic in-place UPDATE. NEVER delete the row first —
      // a failed request must leave the existing album untouched.
      const { error } = await supabase
        .from('user_albums')
        .update(record)
        .eq('user_id', userId)
        .eq('album', originalAlbumName.trim());
      if (error) {
        console.error('Supabase update warning:', error.message);
      }
    } else {
      // Rename: insert the NEW row first, and only delete the old row if the
      // insert succeeded — a transient failure can then never destroy the album.
      const { error: insertErr } = await supabase.from('user_albums').insert([
        { user_id: userId, ...record },
      ]);
      if (insertErr) {
        console.error('Supabase rename insert warning:', insertErr.message);
      } else {
        const { error: deleteErr } = await supabase
          .from('user_albums')
          .delete()
          .eq('user_id', userId)
          .eq('album', originalAlbumName.trim());
        if (deleteErr) {
          console.error('Supabase rename delete warning:', deleteErr.message);
        }
      }
    }
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

/**
 * Persist new tiebreaker rank_order values with in-place UPDATEs only.
 *
 * The old updateUserAlbum() path DELETE + re-INSERTed every row it saved, so a
 * failed insert (network hiccup / Supabase rate limit) permanently removed the
 * album. These UPDATEs are atomic per row: if a request fails the album simply
 * keeps its old order — reordering can never delete a collection again.
 */
export async function updateUserAlbumRankOrders(
  userId: string,
  items: { album: string; rankOrder: number; oldRankOrder?: number | null; entry?: AlbumEntry }[]
): Promise<{ ok: boolean; error?: string }> {
  let ok = true;
  let lastError: string | undefined;

  for (const item of items) {
    const name = String(item.album).trim();
    if (item.oldRankOrder === item.rankOrder) continue; // nothing changed

    const record = {
      user_id: userId,
      album: String(item.entry?.Album ?? item.album),
      artist: item.entry?.Artist ?? '',
      rating: item.entry?.Rating ?? 0,
      genre: item.entry?.Genre ?? '',
      release_year: item.entry?.['Release Year'] ?? 0,
      length: item.entry?.Length ?? '',
      cover_art: item.entry?.CoverArt ?? '',
      apple_music_link: item.entry?.AppleMusicLink ?? '',
      track_count: item.entry?.TrackCount ?? 0,
      exact_release_date: item.entry?.ExactReleaseDate ?? '',
      rank_order: item.rankOrder,
    };

    // Deletes every row for this album EXCEPT the one carrying the desired
    // final rank — removes old copies AND any duplicates from earlier runs,
    // while never touching the row we just inserted. Deletes by album name
    // alone would destroy the replacement row too (that wiped whole tie
    // groups), so this rank-scoped cleanup is what makes reordering safe.
    const deleteStale = () =>
      supabase
        .from('user_albums')
        .delete()
        .eq('user_id', userId)
        .eq('album', name)
        .or(`rank_order.is.null,rank_order.neq.${item.rankOrder}`);

    try {
      // 1) Fast path: atomic in-place UPDATE scoped to the exact pre-drag row
      //    (album name + the rank it had before the drag).
      let q = supabase
        .from('user_albums')
        .update({ rank_order: item.rankOrder })
        .eq('user_id', userId)
        .eq('album', name);
      q = item.oldRankOrder != null ? q.eq('rank_order', item.oldRankOrder) : q.is('rank_order', null);
      const { data, error } = await q.select('album');

      if (!error && Array.isArray(data) && data.length > 0) continue;

      if (error) {
        lastError = error.message;
        console.warn('updateUserAlbumRankOrders: UPDATE unavailable, converging via insert+cleanup for', item.album, error.message);
      } else {
        console.warn('updateUserAlbumRankOrders: UPDATE matched no pre-drag row, converging for', item.album);
      }

      // 2) Converge on exactly ONE row with the final rank:
      const { error: insErr } = await supabase.from('user_albums').insert([record]);
      if (insErr) {
        // The album name is still taken (e.g. a unique constraint or a leftover
        // copy) — remove stale copies first, then insert.
        console.warn('updateUserAlbumRankOrders: insert conflicted, cleaning stale copies for', item.album, insErr.message);
        const { error: staleErr } = await deleteStale();
        if (staleErr) {
          ok = false;
          lastError = staleErr.message;
          console.error('updateUserAlbumRankOrders: stale-copy delete failed for', item.album, staleErr.message);
        }
        const { error: ins2Err } = await supabase.from('user_albums').insert([record]);
        if (ins2Err) {
          ok = false;
          lastError = ins2Err.message;
          console.error('updateUserAlbumRankOrders: reinsert failed for', item.album, ins2Err.message);
        }
      } else {
        // Remove every copy that isn't the final row.
        const { error: cleanErr } = await deleteStale();
        if (cleanErr) {
          ok = false;
          lastError = cleanErr.message;
          console.error('updateUserAlbumRankOrders: cleanup delete failed for', item.album, cleanErr.message);
        }
      }
    } catch (err) {
      ok = false;
      lastError = err instanceof Error ? err.message : String(err);
      console.error('updateUserAlbumRankOrders exception for', item.album, err);
    }
  }

  // Refresh local cache from server truth.
  try {
    const refreshed = await getUserAlbums(userId);
    localStorage.setItem(`albums_user_${userId}`, JSON.stringify(refreshed));
  } catch (err) {
    console.warn('updateUserAlbumRankOrders cache refresh warning:', err);
  }

  return { ok, error: ok ? undefined : lastError };
}

/**
 * Recovery helper: re-insert any albums from the canonical GitHub dataset
 * (`Album-Data.json`) that are missing from this user's collection.
 *
 * Safe to run repeatedly — only missing albums are added, existing rows are
 * never modified or deleted. Intended for the owner account, whose canonical
 * data lives in the repo dataset (user_albums rows were the only casualties of
 * the old delete-then-insert bug).
 */
export async function restoreUserAlbumsFromSeed(
  userId: string
): Promise<{ restored: number; skipped: number }> {
  const seed = rawAlbumData as AlbumEntry[];
  const current = await getUserAlbums(userId);
  const owned = new Set(current.map((a) => String(a.Album).toLowerCase().trim()));

  const missing = seed.filter(
    (a) => !owned.has(String(a.Album).toLowerCase().trim())
  );

  if (missing.length > 0) {
    const rows = missing.map((a) => ({
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
      rank_order: a.RankOrder ?? null,
    }));
    const { error } = await supabase.from('user_albums').insert(rows);
    if (error) {
      console.error('restoreUserAlbumsFromSeed insert error:', error.message);
      return { restored: 0, skipped: owned.size };
    }
  }

  const refreshed = await getUserAlbums(userId);
  localStorage.setItem(`albums_user_${userId}`, JSON.stringify(refreshed));

  return { restored: missing.length, skipped: owned.size };
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
      .eq('album', albumName.trim());
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
