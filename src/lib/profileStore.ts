// profileStore.ts
// Manages user profiles (nickname, join date) and leaderboard aggregates.
//
// ─── SUPABASE TABLE REQUIRED ──────────────────────────────────────────────────
// Run the following in your Supabase SQL editor before deploying:
//
//   CREATE TABLE user_profiles (
//     user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
//     nickname   TEXT NOT NULL UNIQUE,
//     created_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "profiles_read_all" ON user_profiles
//     FOR SELECT USING (auth.role() = 'authenticated');
//   CREATE POLICY "profiles_upsert_own" ON user_profiles
//     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import type { AlbumEntry } from '../types/album';

export interface UserProfile {
  userId: string;
  nickname: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  createdAt: string;
  albumCount: number;
  avgRating: number;
  topAlbum: AlbumEntry | null;
  topAlbumCover: string;
}

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      nickname: data.nickname,
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Create or update the user's nickname.
 * Returns null on success, or an error message string on failure.
 */
export async function setUserNickname(
  userId: string,
  nickname: string
): Promise<string | null> {
  try {
    const { error } = await supabase.from('user_profiles').upsert(
      { user_id: userId, nickname: nickname.trim() },
      { onConflict: 'user_id' }
    );

    if (error) {
      // Postgres unique violation code
      if (error.code === '23505') {
        return 'That nickname is already taken. Please choose another.';
      }
      return error.message;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'An unknown error occurred.';
  }
}

// ─── Leaderboard Data ─────────────────────────────────────────────────────────

/**
 * Fetch all user profiles + their album aggregates for the leaderboard.
 * We fetch profiles first, then batch-fetch albums per user.
 * (For a large user base this would need a DB view, but fine for a personal app.)
 */
export async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  try {
    // 1. Fetch all profiles
    const { data: profiles, error: profErr } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (profErr || !profiles || profiles.length === 0) return [];

    // 2. Fetch all user_albums rows for those users in one query
    const userIds = profiles.map((p: any) => p.user_id);
    const { data: allAlbums, error: albumErr } = await supabase
      .from('user_albums')
      .select('user_id, album, artist, rating, cover_art, genre, release_year')
      .in('user_id', userIds);

    if (albumErr) {
      console.warn('Error fetching leaderboard albums:', albumErr.message);
    }

    const albumsByUser: Record<string, any[]> = {};
    (allAlbums ?? []).forEach((row: any) => {
      if (!albumsByUser[row.user_id]) albumsByUser[row.user_id] = [];
      albumsByUser[row.user_id].push(row);
    });

    // 3. Build leaderboard entries
    return profiles.map((profile: any) => {
      const albums: any[] = albumsByUser[profile.user_id] ?? [];
      const albumCount = albums.length;
      const avgRating =
        albumCount > 0
          ? Math.round(
              (albums.reduce((s: number, a: any) => s + Number(a.rating), 0) /
                albumCount) *
                10
            ) / 10
          : 0;

      const sorted = [...albums].sort(
        (a: any, b: any) => Number(b.rating) - Number(a.rating)
      );
      const top = sorted[0] ?? null;

      return {
        userId: profile.user_id,
        nickname: profile.nickname,
        createdAt: profile.created_at,
        albumCount,
        avgRating,
        topAlbum: top
          ? ({
              Album: top.album,
              Artist: top.artist,
              Rating: Number(top.rating),
              Genre: top.genre ?? '',
              'Release Year': Number(top.release_year ?? 0),
              Length: '',
              CoverArt: top.cover_art ?? '',
            } as AlbumEntry)
          : null,
        topAlbumCover: top?.cover_art ?? '',
      };
    });
  } catch (err) {
    console.error('getLeaderboardData error:', err);
    return [];
  }
}

/**
 * Fetch albums for a specific user (for the profile modal).
 */
export async function getUserAlbumsForProfile(
  userId: string
): Promise<AlbumEntry[]> {
  try {
    const { data, error } = await supabase
      .from('user_albums')
      .select('*')
      .eq('user_id', userId)
      .order('rating', { ascending: false });

    if (error || !data) return [];

    return data.map((item: any) => ({
      Album: item.album,
      Artist: item.artist,
      Rating: Number(item.rating),
      Genre: item.genre ?? '',
      'Release Year': Number(item.release_year ?? 0),
      Length: item.length ?? '',
      CoverArt: item.cover_art ?? '',
      AppleMusicLink: item.apple_music_link ?? '',
    }));
  } catch {
    return [];
  }
}

// ─── Nickname Validation ──────────────────────────────────────────────────────

export function validateNickname(nickname: string): string | null {
  const trimmed = nickname.trim();
  if (trimmed.length < 2) return 'Nickname must be at least 2 characters.';
  if (trimmed.length > 20) return 'Nickname must be 20 characters or fewer.';
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(trimmed))
    return 'Only letters, numbers, spaces, dots, hyphens, and underscores are allowed.';
  return null;
}
