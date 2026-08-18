// recommendationStore.ts
// Calculates internal recommendations strictly from user-submitted albums in Supabase (user_albums).
// Prioritizes direct genre matches, core genre family compatibility, release era, runtime, and high ratings.

import type { AlbumEntry } from '../types/album';
import { supabase } from './supabase';

export interface CommunityRecommendation {
  album: AlbumEntry;
  matchScore: number;
  reason: string;
}

// ─── Genre Family Taxonomy ───────────────────────────────────────────────────

const GENRE_FAMILY_PATTERNS: Record<string, { label: string; keywords: string[] }> = {
  'hip-hop': {
    label: 'Hip-Hop / Rap',
    keywords: [
      'hip hop', 'hip-hop', 'rap', 'trap', 'boom bap', 'east coast', 'west coast',
      'southern rap', 'underground hip hop', 'abstract hip hop', 'conscious hip hop',
      'grime', 'drill', 'cloud rap', 'hardcore hip hop', 'gangsta rap', 'jazz rap',
      'turntablism', 'instrumental hip hop'
    ],
  },
  'rock': {
    label: 'Rock',
    keywords: [
      'rock', 'indie rock', 'alternative rock', 'post-punk', 'punk', 'grunge',
      'shoegaze', 'garage rock', 'psychedelic rock', 'art rock', 'hard rock',
      'progressive rock', 'classic rock', 'folk rock', 'emo', 'math rock',
      'krautrock', 'noise rock', 'post-rock', 'glam rock', 'punk rock', 'indie'
    ],
  },
  'metal': {
    label: 'Metal',
    keywords: [
      'metal', 'heavy metal', 'thrash metal', 'death metal', 'black metal',
      'doom metal', 'metalcore', 'nu metal', 'post-metal', 'sludge metal',
      'progressive metal', 'industrial metal', 'power metal', 'grindcore'
    ],
  },
  'pop': {
    label: 'Pop',
    keywords: [
      'pop', 'indie pop', 'synthpop', 'electropop', 'art pop', 'dance-pop',
      'dream pop', 'chamber pop', 'k-pop', 'hyperpop', 'bedroom pop', 'j-pop',
      'sophisti-pop', 'baroque pop', 'teen pop'
    ],
  },
  'r&b-soul': {
    label: 'R&B / Soul',
    keywords: [
      'r&b', 'r & b', 'soul', 'neo-soul', 'funk', 'motown', 'contemporary r&b',
      'doo-wop', 'disco', 'quiet storm', 'p-funk'
    ],
  },
  'jazz': {
    label: 'Jazz',
    keywords: [
      'jazz', 'bebop', 'hard bop', 'cool jazz', 'modal jazz', 'free jazz',
      'jazz fusion', 'fusion', 'bossa nova', 'big band', 'swing', 'vocal jazz',
      'latin jazz', 'post-bop', 'smooth jazz', 'traditional pop'
    ],
  },
  'electronic': {
    label: 'Electronic',
    keywords: [
      'electronic', 'ambient', 'techno', 'house', 'idm', 'drum and bass',
      'synthwave', 'downtempo', 'trance', 'electro', 'trip hop', 'dubstep',
      'garage', 'drone', 'electronica', 'uk bass', 'glitch', 'vaporwave'
    ],
  },
  'folk-country': {
    label: 'Folk / Country',
    keywords: [
      'folk', 'singer-songwriter', 'americana', 'country', 'bluegrass',
      'alt-country', 'acoustic', 'indie folk', 'traditional folk', 'appalachian'
    ],
  },
  'classical': {
    label: 'Classical',
    keywords: [
      'classical', 'orchestral', 'baroque', 'romantic', 'contemporary classical',
      'minimalism', 'film score', 'soundtrack', 'choral', 'opera'
    ],
  },
};

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

function cleanGenre(str?: string): string {
  return (str ?? '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGenreTokens(genreStr?: string): string[] {
  if (!genreStr) return [];
  return genreStr
    .toLowerCase()
    .split(/[,/&]+/)
    .map((g) => cleanGenre(g))
    .filter((g) => g.length > 1);
}

function detectGenreFamilies(genreStr?: string): Set<string> {
  const families = new Set<string>();
  if (!genreStr) return families;
  const cleaned = cleanGenre(genreStr);

  for (const [familyKey, { keywords }] of Object.entries(GENRE_FAMILY_PATTERNS)) {
    for (const kw of keywords) {
      // Whole-phrase or bounded matching to avoid false positives
      const regex = new RegExp(`\\b${kw.replace('-', '[- ]')}\\b`, 'i');
      if (regex.test(cleaned)) {
        families.add(familyKey);
        break;
      }
    }
  }

  return families;
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
 *
 * CRITICAL REQUIREMENT:
 * Direct and family genre compatibility is mandatory.
 * Albums from unrelated genres (e.g. Pop/Jazz for a Hip-Hop album) are strictly filtered out.
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

  const targetTokens = extractGenreTokens(targetAlbum.Genre);
  const targetPrimaryToken = targetTokens[0] ?? cleanGenre(targetAlbum.Genre.split(',')[0]);
  const targetFamilies = detectGenreFamilies(targetAlbum.Genre);
  const targetYear = targetAlbum['Release Year'] || 0;
  const targetSecs = parseLengthToSeconds(targetAlbum.Length);

  const scoredCandidates: CommunityRecommendation[] = [];

  for (const candidate of communityAlbums) {
    const candidateKey = `${String(candidate.Album).toLowerCase().trim()}:::${candidate.Artist.toLowerCase().trim()}`;
    if (excludedKeys.has(candidateKey)) continue;

    const isSameArtist = targetAlbum.Artist.toLowerCase().trim() === candidate.Artist.toLowerCase().trim();
    const candidateTokens = extractGenreTokens(candidate.Genre);
    const candidatePrimaryToken = candidateTokens[0] ?? cleanGenre(candidate.Genre.split(',')[0]);
    const candidateFamilies = detectGenreFamilies(candidate.Genre);

    let genreScore = 0;
    let matchType: 'direct_exact' | 'token_match' | 'family_match' | 'none' = 'none';
    let primaryMatchLabel = '';

    // 1. Direct Primary Genre Exact Match (e.g. "Hip-Hop" == "Hip-Hop" or "Art Pop" == "Art Pop")
    if (targetPrimaryToken && candidatePrimaryToken && targetPrimaryToken === candidatePrimaryToken) {
      genreScore += 1000;
      matchType = 'direct_exact';
      primaryMatchLabel = candidate.Genre.split(',')[0].trim();
    } else {
      // Check for exact token overlaps
      const sharedTokens = targetTokens.filter((tt) => candidateTokens.includes(tt));
      if (sharedTokens.length > 0) {
        genreScore += 700 + (sharedTokens.length - 1) * 100;
        matchType = 'token_match';
        primaryMatchLabel = sharedTokens[0].charAt(0).toUpperCase() + sharedTokens[0].slice(1);
      } else {
        // Check for shared genre families
        const sharedFamilies = Array.from(targetFamilies).filter((f) => candidateFamilies.has(f));
        if (sharedFamilies.length > 0) {
          genreScore += 500;
          matchType = 'family_match';
          primaryMatchLabel = GENRE_FAMILY_PATTERNS[sharedFamilies[0]]?.label || candidate.Genre.split(',')[0].trim();
        }
      }
    }

    // STRICT FILTER: If candidate shares NO genre family, NO token match, and is NOT the same artist,
    // REJECT candidate immediately. Never recommend Laufey (Pop/Jazz) for MF DOOM (Hip-Hop).
    if (genreScore === 0 && !isSameArtist) {
      continue;
    }

    // Artist affinity
    if (isSameArtist) {
      genreScore += 600;
    }

    // 2. High User Rating (Weight: ~20% of total score)
    const ratingScore = candidate.Rating * 20; // 9.5 rating = 190 points

    // 3. Era / Release Year Proximity
    let eraScore = 0;
    const candidateYear = candidate['Release Year'] || 0;
    let eraReason = '';
    if (targetYear > 0 && candidateYear > 0) {
      const yearDiff = Math.abs(targetYear - candidateYear);
      if (yearDiff === 0) {
        eraScore = 40;
        eraReason = `same year (${candidateYear})`;
      } else if (yearDiff <= 3) {
        eraScore = 30;
        eraReason = `${candidateYear}`;
      } else if (yearDiff <= 8) {
        eraScore = 18;
      } else if (yearDiff <= 15) {
        eraScore = 8;
      }
    }

    // 4. Runtime Proximity
    let lengthScore = 0;
    const candidateSecs = parseLengthToSeconds(candidate.Length);
    let lengthReason = '';
    if (targetSecs > 0 && candidateSecs > 0) {
      const secDiff = Math.abs(targetSecs - candidateSecs);
      if (secDiff <= 300) { // within 5 mins
        lengthScore = 25;
        lengthReason = `~${formatSeconds(candidateSecs)}`;
      } else if (secDiff <= 600) {
        lengthScore = 12;
      }
    }

    // Must have valid cover art bonus
    const coverBonus = (candidate.CoverArt && candidate.CoverArt !== 'Not Found') ? 20 : 0;

    const totalScore = genreScore + ratingScore + eraScore + lengthScore + coverBonus;

    // Construct human-readable reason
    let reason = '';
    if (isSameArtist) {
      reason = `Another standout album by ${candidate.Artist} (${candidate.Rating.toFixed(1)}/10)`;
    } else if (matchType === 'direct_exact') {
      reason = `Direct ${primaryMatchLabel} match · Rated ${candidate.Rating.toFixed(1)}/10 by community`;
    } else if (matchType === 'token_match') {
      reason = `Top-rated ${primaryMatchLabel} recommendation (${candidate.Rating.toFixed(1)}/10)`;
    } else if (matchType === 'family_match') {
      reason = `Matching ${primaryMatchLabel} style (${candidate.Rating.toFixed(1)}/10)`;
    } else {
      reason = `Community favorite (${candidate.Rating.toFixed(1)}/10)`;
    }

    if (eraReason && reason.length < 50) {
      reason += ` · ${eraReason}`;
    }
    if (lengthReason && reason.length < 65) {
      reason += ` · ${lengthReason}`;
    }

    scoredCandidates.push({
      album: candidate,
      matchScore: totalScore,
      reason,
    });
  }

  // Sort strictly by total score descending (direct genre matches heavily dominate)
  scoredCandidates.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.album.Rating - a.album.Rating;
  });

  return scoredCandidates.slice(0, 3);
}
