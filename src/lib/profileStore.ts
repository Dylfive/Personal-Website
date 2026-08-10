// profileStore.ts
// Manages user profiles (nickname, join date, display preferences) and leaderboard aggregates.
//
// ─── SUPABASE TABLES & RLS REQUIRED ──────────────────────────────────────────
// Run the following in your Supabase SQL editor before deploying:
//
//   CREATE TABLE IF NOT EXISTS user_profiles (
//     user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
//     nickname      TEXT NOT NULL UNIQUE,
//     visible_stats JSONB DEFAULT '["albums","avgRating","topEra","favoriteGenre","highestRated"]'::jsonb,
//     created_at    TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "profiles_read_all" ON user_profiles
//     FOR SELECT USING (true);
//   CREATE POLICY "profiles_upsert_own" ON user_profiles
//     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
//   -- RLS for user_albums: ALLOW SELECT FOR ALL USERS (so friends can see stats)
//   ALTER TABLE user_albums ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "user_albums_read_all" ON user_albums
//     FOR SELECT USING (true);
//   CREATE POLICY "user_albums_write_own" ON user_albums
//     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import type { AlbumEntry } from '../types/album';

export interface UserProfile {
  userId: string;
  nickname: string;
  createdAt: string;
  visibleStats?: string[];
  uiTheme?: string;
  profileAccent?: string;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  createdAt: string;
  albumCount: number;
  avgRating: number;
  topAlbum: AlbumEntry | null;
  topAlbumCover: string;
  visibleStats?: string[];
}

export const ALL_STAT_KEYS = [
  { key: 'albums', label: 'Total Albums' },
  { key: 'avgRating', label: 'Average Rating' },
  { key: 'topEra', label: 'Top Era / Decade' },
  { key: 'favoriteGenre', label: 'Favorite Genre' },
  { key: 'highestRated', label: 'Highest Rated Album' },
  { key: 'lowestRated', label: 'Lowest Rated Album' },
  { key: 'topArtist', label: 'Top Artist' },
  { key: 'shortest', label: 'Shortest Album' },
  { key: 'longest', label: 'Longest Album' },
];

export const DEFAULT_VISIBLE_STATS = ['albums', 'avgRating', 'topEra', 'favoriteGenre', 'highestRated'];

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    let visibleStats = DEFAULT_VISIBLE_STATS;
    if (data.visible_stats && Array.isArray(data.visible_stats)) {
      visibleStats = data.visible_stats;
    } else {
      const savedLocal = localStorage.getItem(`profile_visible_stats_${userId}`);
      if (savedLocal) {
        try { visibleStats = JSON.parse(savedLocal); } catch {}
      }
    }

    return {
      userId: data.user_id,
      nickname: data.nickname,
      createdAt: data.created_at,
      visibleStats,
    };
  } catch {
    return null;
  }
}

/**
 * Update user's visible stats preferences.
 */
export async function setUserVisibleStats(
  userId: string,
  visibleStats: string[]
): Promise<boolean> {
  localStorage.setItem(`profile_visible_stats_${userId}`, JSON.stringify(visibleStats));
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ visible_stats: visibleStats })
      .eq('user_id', userId);
    return !error;
  } catch {
    return true; // saved locally
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
 * Fetches profiles first, then batch-fetches albums per user.
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
      .select('user_id, album, artist, rating, cover_art, genre, release_year, rank_order, is_hidden')
      .in('user_id', userIds);

    if (albumErr) {
      console.warn('Error fetching leaderboard albums:', albumErr.message);
    }

    const albumsByUser: Record<string, any[]> = {};
    (allAlbums ?? []).forEach((row: any) => {
      // Ignore hidden albums for leaderboard statistics
      if (row.is_hidden) return;
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

      // Sort by rating desc, then rank_order asc (tie-breaker rank)
      const sorted = [...albums].sort((a: any, b: any) => {
        if (Number(b.rating) !== Number(a.rating)) {
          return Number(b.rating) - Number(a.rating);
        }
        const rA = a.rank_order !== null && a.rank_order !== undefined ? Number(a.rank_order) : 999;
        const rB = b.rank_order !== null && b.rank_order !== undefined ? Number(b.rank_order) : 999;
        return rA - rB;
      });
      const top = sorted[0] ?? null;

      let visibleStats = DEFAULT_VISIBLE_STATS;
      if (profile.visible_stats && Array.isArray(profile.visible_stats)) {
        visibleStats = profile.visible_stats;
      } else {
        const savedLocal = localStorage.getItem(`profile_visible_stats_${profile.user_id}`);
        if (savedLocal) {
          try { visibleStats = JSON.parse(savedLocal); } catch {}
        }
      }

      return {
        userId: profile.user_id,
        nickname: profile.nickname,
        createdAt: profile.created_at,
        albumCount,
        avgRating,
        visibleStats,
        topAlbum: top
          ? ({
              Album: top.album,
              Artist: top.artist,
              Rating: Number(top.rating),
              Genre: top.genre ?? '',
              'Release Year': Number(top.release_year ?? 0),
              Length: '',
              CoverArt: top.cover_art ?? '',
              RankOrder: top.rank_order !== null && top.rank_order !== undefined ? Number(top.rank_order) : undefined,
              IsHidden: top.is_hidden ?? false,
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
 * If isSelf is false, hidden albums are excluded.
 */
export async function getUserAlbumsForProfile(
  userId: string,
  includeHidden = false
): Promise<AlbumEntry[]> {
  try {
    let query = supabase
      .from('user_albums')
      .select('*')
      .eq('user_id', userId);

    if (!includeHidden) {
      query = query.or('is_hidden.eq.false,is_hidden.is.null');
    }

    const { data, error } = await query;

    if (error || !data) return [];

    const parsed: AlbumEntry[] = data.map((item: any) => ({
      Album: item.album,
      Artist: item.artist,
      Rating: Number(item.rating),
      Genre: item.genre ?? '',
      'Release Year': Number(item.release_year ?? 0),
      Length: item.length ?? '',
      CoverArt: item.cover_art ?? '',
      AppleMusicLink: item.apple_music_link ?? '',
      RankOrder: item.rank_order !== undefined && item.rank_order !== null ? Number(item.rank_order) : undefined,
      IsHidden: item.is_hidden ?? false,
    }));

    // Sort by rating desc, then rank_order asc (tie breaker)
    parsed.sort((a, b) => {
      if (b.Rating !== a.Rating) return b.Rating - a.Rating;
      return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
    });

    return parsed;
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

