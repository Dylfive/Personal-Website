// recommendationStore.ts
// Calculates internal recommendations strictly from user-submitted albums in Supabase (user_albums).
// Scored by Genre overlap, Release Year/Era proximity, Total Length proximity, and high user ratings.

import type { AlbumEntry } from '../types/album';
import { supabase } from './supabase';

export interface CommunityRecommendation {
  album: AlbumEntry;
  matchScore: number;
  reason: string;
  contributorCount?: number;
}

function parseLengthToSeconds(length?: string): number {
  if (!length) return 0;
  const parts = length.split(':').map(Number);
  if (parts.length === 3) {
    const asHMS = parts[0] * 3600 + parts[1] * 60 + parts[2];
    const asMS = parts[0] * 60 + parts[1];
    return parts[0] > 3 ? asMS : asHMS;
  }
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function extractGenreTokens(genreStr?: string): string[] {
  if (!genreStr) return [];
  return genreStr
    .toLowerCase()
    .split(/[,/&]+/)
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
}

/**
 * Fetches all curated user albums from Supabase `user_albums` table.
 * Deduplicates multiple ratings of the same album across users, keeping the highest rated copy.
 */
export async function fetchAllUserAlbums(): Promise<AlbumEntry[]> {
  try {
    const { data, error } = await supabase
      .from('user_albums')
      .select('*')
      .eq('is_hidden', false)
      .order('rating', { ascending: false });

    if (error || !data) {
      console.warn('Failed to fetch community user_albums:', error);
      return [];
    }

    const albumsMap = new Map<string, AlbumEntry>();

    for (const item of data) {
      const albumTitle = (item.album ?? '').trim();
      const artist = (item.artist ?? '').trim();
      if (!albumTitle || !artist) continue;

      const key = `${albumTitle.toLowerCase()}:::${artist.toLowerCase()}`;
      const parsed: AlbumEntry = {
        Album: albumTitle,
        Artist: artist,
        Rating: Number(item.rating ?? 0),
        Genre: item.genre ?? '',
        'Release Year': Number(item.release_year ?? 0),
        Length: item.length ?? '',
        CoverArt: item.cover_art ?? '',
        AppleMusicLink: item.apple_music_link ?? '',
        TrackCount: item.track_count ?? 0,
        ExactReleaseDate: item.exact_release_date ?? '',
        RankOrder: item.rank_order != null ? Number(item.rank_order) : undefined,
      };

      const existing = albumsMap.get(key);
      if (!existing || parsed.Rating > existing.Rating) {
        albumsMap.set(key, parsed);
      }
    }

    return Array.from(albumsMap.values());
  } catch (err) {
    console.warn('Error querying user_albums for recommendations:', err);
    return [];
  }
}

/**
 * Calculates top 3 community recommendations based on a target album
 * using strictly user albums from Supabase.
 */
export async function getCommunityRecommendations(
  targetAlbum: AlbumEntry,
  userCollection: AlbumEntry[] = [],
  cachedCommunityPool?: AlbumEntry[]
): Promise<CommunityRecommendation[]> {
  const communityAlbums = cachedCommunityPool && cachedCommunityPool.length > 0
    ? cachedCommunityPool
    : await fetchAllUserAlbums();

  if (!communityAlbums || communityAlbums.length === 0) {
    return [];
  }

  // Build exclusion set from target album and current user's collection
  const excludedKeys = new Set<string>();
  const targetKey = `${String(targetAlbum.Album).toLowerCase().trim()}:::${targetAlbum.Artist.toLowerCase().trim()}`;
  excludedKeys.add(targetKey);

  for (const item of userCollection) {
    excludedKeys.add(`${String(item.Album).toLowerCase().trim()}:::${item.Artist.toLowerCase().trim()}`);
  }

  const targetGenres = extractGenreTokens(targetAlbum.Genre);
  const targetPrimaryGenre = targetGenres[0] ?? '';
  const targetYear = targetAlbum['Release Year'] || 0;
  const targetSecs = parseLengthToSeconds(targetAlbum.Length);

  const scoredCandidates: CommunityRecommendation[] = [];

  for (const candidate of communityAlbums) {
    const candidateKey = `${String(candidate.Album).toLowerCase().trim()}:::${candidate.Artist.toLowerCase().trim()}`;
    if (excludedKeys.has(candidateKey)) continue;

    let score = 0;
    const matchReasons: string[] = [];

    // 1. Genre Overlap (Weight: ~45%)
    const candidateGenres = extractGenreTokens(candidate.Genre);
    const candidatePrimaryGenre = candidateGenres[0] ?? '';

    let genreOverlapCount = 0;
    if (targetPrimaryGenre && candidatePrimaryGenre && targetPrimaryGenre === candidatePrimaryGenre) {
      score += 45;
      genreOverlapCount++;
      matchReasons.push(`Shares primary genre (${candidate.Genre.split(',')[0].trim()})`);
    } else {
      for (const tg of targetGenres) {
        if (candidateGenres.includes(tg)) {
          score += 25;
          genreOverlapCount++;
          if (matchReasons.length === 0) {
            matchReasons.push(`Shares genre: ${tg.charAt(0).toUpperCase() + tg.slice(1)}`);
          }
        } else {
          // Partial keyword match (e.g. "rock", "folk", "jazz", "metal", "electronic")
          const hasKeywordMatch = candidateGenres.some((cg) => cg.includes(tg) || tg.includes(cg));
          if (hasKeywordMatch) {
            score += 12;
            genreOverlapCount++;
          }
        }
      }
    }

    // If there is zero genre relation and different artist, skip candidate unless rating is exceptional
    const isSameArtist = targetAlbum.Artist.toLowerCase().trim() === candidate.Artist.toLowerCase().trim();
    if (isSameArtist) {
      score += 35;
      matchReasons.unshift(`Another top-rated album by ${candidate.Artist}`);
    }

    if (genreOverlapCount === 0 && !isSameArtist) {
      continue;
    }

    // 2. High User Rating (Weight: ~30%)
    const rating = candidate.Rating;
    score += rating * 3.5; // e.g. 9.0 = 31.5 pts
    if (rating >= 9.0) {
      score += 15;
    } else if (rating >= 8.0) {
      score += 8;
    }

    // 3. Era / Release Year Proximity (Weight: ~15%)
    const candidateYear = candidate['Release Year'] || 0;
    if (targetYear > 0 && candidateYear > 0) {
      const yearDiff = Math.abs(targetYear - candidateYear);
      if (yearDiff === 0) {
        score += 20;
        matchReasons.push(`Released the exact same year (${candidateYear})`);
      } else if (yearDiff <= 3) {
        score += 15;
        matchReasons.push(`Released in the same era (${candidateYear})`);
      } else if (yearDiff <= 8) {
        score += 10;
      } else if (yearDiff <= 15) {
        score += 5;
      }
    }

    // 4. Runtime / Album Length Proximity (Weight: ~10%)
    const candidateSecs = parseLengthToSeconds(candidate.Length);
    if (targetSecs > 0 && candidateSecs > 0) {
      const secDiff = Math.abs(targetSecs - candidateSecs);
      if (secDiff <= 300) { // Within 5 minutes
        score += 12;
        if (matchReasons.length < 2) {
          matchReasons.push(`Matching album runtime (~${formatSeconds(candidateSecs)})`);
        }
      } else if (secDiff <= 600) { // Within 10 minutes
        score += 6;
      }
    }

    // 5. Must have valid cover art preference
    if (candidate.CoverArt && candidate.CoverArt !== 'Not Found') {
      score += 5;
    }

    const finalReason = matchReasons.length > 0
      ? matchReasons.slice(0, 2).join(' · ')
      : `Top-rated community pick (${candidate.Rating.toFixed(1)}/10) in ${candidate.Genre.split(',')[0] || 'Music'}`;

    scoredCandidates.push({
      album: candidate,
      matchScore: Math.round(score),
      reason: finalReason,
    });
  }

  // Sort by match score descending, then rating descending
  scoredCandidates.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.album.Rating - a.album.Rating;
  });

  return scoredCandidates.slice(0, 3);
}
