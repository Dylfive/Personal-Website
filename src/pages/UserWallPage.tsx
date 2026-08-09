import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Music, ExternalLink, Star, Calendar,
  Trophy, Disc3, Search, ArrowUpDown, Mic2, ArrowLeft
} from 'lucide-react';
import { getUserAlbumsForProfile, getUserProfile } from '../lib/profileStore';
import type { AlbumEntry } from '../types/album';
import type { UserProfile } from '../lib/profileStore';

type SortOption = 'rating' | 'year_desc' | 'year_asc' | 'title' | 'artist';

function parseLengthToSeconds(length: string): number {
  const parts = length.split(':').map(Number);
  if (parts.length === 3) {
    const asHMS = parts[0] * 3600 + parts[1] * 60 + parts[2];
    const asMS = parts[0] * 60 + parts[1];
    return parts[0] > 3 ? asMS : asHMS;
  }
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function generateGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 120) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,30%), hsl(${h2},80%,20%))`;
}

const NEON_COLORS = ['#bc13fe', '#3b82f6', '#06b6d4', '#d946ef', '#22c55e', '#f59e0b', '#ef4444'];

function computeTopGenres(albums: AlbumEntry[], topN = 7) {
  const map: Record<string, { total: number; count: number }> = {};
  albums.forEach((a) => {
    const primary = a.Genre.split(',')[0].trim();
    if (!map[primary]) map[primary] = { total: 0, count: 0 };
    map[primary].total += a.Rating;
    map[primary].count += 1;
  });
  return Object.entries(map)
    .map(([genre, { total, count }]) => ({ genre, avg: Math.round((total / count) * 10) / 10, count }))
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, topN);
}

function computeStats(albums: AlbumEntry[]) {
  const sorted = [...albums].sort((a, b) => a['Release Year'] - b['Release Year']);
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const withLength = albums.filter((a) => parseLengthToSeconds(a.Length) > 0);
  const byLength = [...withLength].sort((a, b) => parseLengthToSeconds(a.Length) - parseLengthToSeconds(b.Length));
  const shortest = byLength[0];
  const longest = byLength[byLength.length - 1];
  const highestRated = [...albums].sort((a, b) => b.Rating - a.Rating)[0];
  const lowestRated = [...albums].sort((a, b) => a.Rating - b.Rating)[0];
  const avgRating = Math.round((albums.reduce((s, a) => s + a.Rating, 0) / (albums.length || 1)) * 10) / 10;
  const artistCounts: Record<string, number> = {};
  albums.forEach((a) => { artistCounts[a.Artist] = (artistCounts[a.Artist] || 0) + 1; });
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
  return { oldest, newest, shortest, longest, highestRated, lowestRated, avgRating, topArtist };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="glass-panel rounded-2xl p-4 border border-white/10 flex gap-3 items-start hover:border-[color:var(--accent-primary)]/40 transition-all duration-300 group">
    <div className="text-[color:var(--accent-primary)] mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white truncate">{value}</p>
      {sub && <p className="text-xs text-white/50 truncate">{sub}</p>}
    </div>
  </div>
);

const GenreBar = ({ genre, avg, count, max, color }: { genre: string; avg: number; count: number; max: number; color: string }) => (
  <div className="group">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-semibold text-white/80 truncate max-w-[60%]">{genre}</span>
      <span className="text-xs font-bold" style={{ color }}>{avg.toFixed(1)}</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${(avg / (max || 1)) * 100}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
    <p className="text-[10px] text-white/30 mt-0.5">{count} album{count !== 1 ? 's' : ''}</p>
  </div>
);

// ─── Album List ───────────────────────────────────────────────────────────────
const AlbumList = ({ albums }: { albums: AlbumEntry[] }) => {
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let result = albums.filter((a) => {
      const matchTitle = String(a.Album).toLowerCase().includes(query);
      const matchArtist = a.Artist.toLowerCase().includes(query);
      const matchGenre = a.Genre.toLowerCase().includes(query);
      const matchRating = a.Rating.toFixed(1).includes(query) || String(a.Rating).includes(query);
      const matchSong = (a.TopSong ?? '').toLowerCase().includes(query);
      return matchTitle || matchArtist || matchGenre || matchRating || matchSong;
    });
    result.sort((a, b) => {
      if (sortBy === 'rating') return b.Rating - a.Rating;
      if (sortBy === 'year_desc') return b['Release Year'] - a['Release Year'];
      if (sortBy === 'year_asc') return a['Release Year'] - b['Release Year'];
      if (sortBy === 'title') return String(a.Album).localeCompare(String(b.Album));
      if (sortBy === 'artist') return a.Artist.localeCompare(b.Artist);
      return 0;
    });
    return result;
  }, [albums, searchQuery, sortBy]);

  return (
    <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search albums, artists, songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[color:var(--accent-primary)]/50 focus:ring-1 focus:ring-[color:var(--accent-primary)]/50 transition-all"
            />
          </div>
          <div className="relative w-full sm:w-auto min-w-[160px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-8 text-sm text-white focus:outline-none focus:border-[color:var(--accent-primary)]/50 focus:ring-1 focus:ring-[color:var(--accent-primary)]/50 transition-all cursor-pointer"
            >
              <option value="rating" className="bg-[#1a1a1a]">Highest Rated</option>
              <option value="year_desc" className="bg-[#1a1a1a]">Newest First</option>
              <option value="year_asc" className="bg-[#1a1a1a]">Oldest First</option>
              <option value="title" className="bg-[#1a1a1a]">Title (A-Z)</option>
              <option value="artist" className="bg-[#1a1a1a]">Artist (A-Z)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronRight className="w-4 h-4 text-white/40 rotate-90" />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-end mt-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--accent-primary)] flex items-center gap-2">
            <Disc3 className="w-4 h-4" /> Collection
          </h3>
          <p className="text-white/40 text-xs font-mono">{filteredAndSorted.length} results</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredAndSorted.length > 0 ? filteredAndSorted.map((album, idx) => {
            const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
            const isRatingSort = sortBy === 'rating';
            const globalRank = isRatingSort ? albums.findIndex(a => a.Album === album.Album && a.Artist === album.Artist) + 1 : null;

            return (
              <motion.div
                key={`${album.Album}-${album.Artist}-${idx}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx > 20 ? 0 : idx * 0.05 }}
                className="glass-panel p-3 rounded-2xl flex gap-4 items-center group hover:bg-white/10 transition-colors"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0">
                  {hasCover ? (
                    <img src={album.CoverArt} alt={`${album.Album} cover`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: generateGradient(String(album.Album) + album.Artist) }}>
                      <Music className="w-6 h-6 text-white/30" />
                    </div>
                  )}
                  {isRatingSort && globalRank && (
                    <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-md rounded border border-white/10 px-1.5 py-0.5">
                      <p className="text-[10px] font-black leading-none text-white">#{globalRank}</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-base sm:text-lg font-bold text-white truncate">{String(album.Album)}</h4>
                  <p className="text-xs sm:text-sm text-[color:var(--accent-primary)] truncate">{album.Artist}</p>

                  {/* Passive Top Song */}
                  {album.TopSong && (
                    <p className="text-xs text-white/70 font-medium truncate mt-0.5 flex items-center gap-1">
                      <Mic2 className="w-3 h-3 text-[color:var(--accent-primary)] shrink-0" />
                      <span className="italic text-white/80">"{album.TopSong}"</span>
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[color:var(--accent-primary)] fill-[color:var(--accent-primary)]" />
                      <span className="text-xs font-bold text-white">{album.Rating.toFixed(1)}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1 text-white/50 text-xs">
                      <Calendar className="w-3 h-3" />
                      <span>{album['Release Year']}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-white/20 hidden xs:inline-block" />
                    <span className="text-[10px] uppercase tracking-wider text-white/40 truncate max-w-[100px] hidden xs:inline">
                      {album.Genre.split(',')[0]}
                    </span>
                  </div>
                </div>

                {album.AppleMusicLink && (
                  <a href={album.AppleMusicLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2 sm:px-4 sm:py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-[color:var(--accent-primary)]/50 hover:bg-white/5 transition-all duration-200">
                    <ExternalLink className="w-4 h-4 sm:hidden" />
                    <span className="hidden sm:inline text-xs font-bold">Listen</span>
                  </a>
                )}
              </motion.div>
            );
          }) : (
            <div className="h-full flex flex-col items-center justify-center text-white/40">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No albums found.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function UserWallPage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      setLoading(true);
      const [profData, albumData] = await Promise.all([
        getUserProfile(userId),
        getUserAlbumsForProfile(userId, false),
      ]);
      setProfile(profData);
      setAlbums(albumData);
      setLoading(false);
    }
    load();
  }, [userId]);

  const baseSortedAlbums = useMemo(
    () => [...albums].sort((a, b) => b.Rating - a.Rating),
    [albums]
  );

  const topGenres = useMemo(() => computeTopGenres(albums), [albums]);
  const maxGenreAvg = topGenres[0]?.avg ?? 10;
  const stats = useMemo(() => (albums.length > 0 ? computeStats(albums) : null), [albums]);

  const displayName = profile?.nickname ?? 'User';

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
          className="w-10 h-10 border-2 border-white/20 border-t-[color:var(--accent-primary)] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-10 relative overflow-hidden">
      <div className="container mx-auto relative z-10 max-w-6xl">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leaderboard
        </Link>

        {/* Hero Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-serif font-black mb-3">
            {displayName}'s <span className="gradient-text">Album Wall</span>
          </h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
            {albums.length} albums rated by @{displayName}.
          </p>
        </div>

        {/* Dashboard layout */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Music className="text-[color:var(--accent-primary)]" />
                {displayName}'s List
              </h3>
              <p className="text-white/40 text-sm mt-1">
                {albums.length} albums rated
              </p>
            </div>
          </div>

          {/* 3-segment grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 flex flex-col h-[950px]">
              <AlbumList albums={baseSortedAlbums} />
            </div>

            <div className="lg:col-span-5 flex flex-col gap-5 h-full">
              <div className="glass-panel rounded-3xl border border-white/10 p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-[color:var(--accent-primary)]" />
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Top Genres</h4>
                </div>
                <div className="space-y-3">
                  {topGenres.map((g, i) => (
                    <GenreBar key={g.genre} genre={g.genre} avg={g.avg} count={g.count} max={maxGenreAvg} color={NEON_COLORS[i % NEON_COLORS.length]} />
                  ))}
                </div>
              </div>

              {stats && stats.highestRated && (
                <div className="glass-panel rounded-3xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4 text-[color:var(--accent-primary)]" />
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Interesting Stats</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                    <StatCard icon={<Trophy className="w-4 h-4" />} label="Highest Rated" value={String(stats.highestRated.Album)} sub={`${stats.highestRated.Artist} · ${stats.highestRated.Rating}/10`} />
                    <StatCard icon={<Star className="w-4 h-4" />} label="Avg Rating" value={`${stats.avgRating} / 10`} sub={`across ${albums.length} albums`} />
                    {stats.oldest && <StatCard icon={<Calendar className="w-4 h-4" />} label="Oldest Album" value={String(stats.oldest.Album)} sub={`${stats.oldest.Artist} · ${stats.oldest['Release Year']}`} />}
                    {stats.newest && <StatCard icon={<Calendar className="w-4 h-4" />} label="Newest Album" value={String(stats.newest.Album)} sub={`${stats.newest.Artist} · ${stats.newest['Release Year']}`} />}
                    {stats.topArtist && <StatCard icon={<Disc3 className="w-4 h-4" />} label="Most Listened" value={stats.topArtist[0]} sub={`${stats.topArtist[1]} albums rated`} />}
                    {stats.lowestRated && <StatCard icon={<Music className="w-4 h-4" />} label="Lowest Rated" value={String(stats.lowestRated.Album)} sub={`${stats.lowestRated.Artist} · ${stats.lowestRated.Rating}/10`} />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
