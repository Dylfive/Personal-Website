import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Music, ExternalLink, Star, Calendar, Clock, Trophy, Disc3, Search, ArrowUpDown } from 'lucide-react';
import rawAlbumData from '../data/Album-Data.json';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Album {
  Album: string | number;
  Artist: string;
  Rating: number;
  Genre: string;
  'Release Year': number;
  Length: string;
  CoverArt?: string;
  AppleMusicLink?: string;
  TrackCount?: number;
  ExactReleaseDate?: string;
}

type SortOption = 'rating' | 'year_desc' | 'year_asc' | 'title' | 'artist';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseLengthToSeconds(length: string): number {
  // Google Sheets exports duration as "MM:SS:00" (minutes:seconds:frames).
  // A true HH:MM:SS album would be 100+ minutes which is very rare.
  // We detect the format: if it's 3 parts and the first part < 10 AND total > 1h,
  // treat as HH:MM:SS, otherwise treat as MM:SS(:00).
  const parts = length.split(':').map(Number);
  if (parts.length === 3) {
    const asHMS = parts[0] * 3600 + parts[1] * 60 + parts[2];
    const asMS  = parts[0] * 60  + parts[1]; // ignore trailing :00
    // If treating as H:M:S gives > 2 hours, it's almost certainly MM:SS:00
    return asHMS > 7200 ? asMS : asHMS;
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

// Generates a deterministic gradient for albums missing cover art
function generateGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 120) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,30%), hsl(${h2},80%,20%))`;
}

// ─── Genre Stats ──────────────────────────────────────────────────────────────
const NEON_COLORS = ['#bc13fe', '#3b82f6', '#06b6d4', '#d946ef', '#22c55e', '#f59e0b', '#ef4444'];

function computeTopGenres(albums: Album[], topN = 7) {
  const map: Record<string, { total: number; count: number }> = {};
  albums.forEach((a) => {
    const primary = a.Genre.split(',')[0].trim();
    if (!map[primary]) map[primary] = { total: 0, count: 0 };
    map[primary].total += a.Rating;
    map[primary].count += 1;
  });
  return Object.entries(map)
    .map(([genre, { total, count }]) => ({
      genre,
      avg: Math.round((total / count) * 10) / 10,
      count,
    }))
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, topN);
}

// ─── Interesting Stats ────────────────────────────────────────────────────────
function computeStats(albums: Album[]) {
  const sorted = [...albums].sort((a, b) => a['Release Year'] - b['Release Year']);
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const withLength = albums.filter((a) => parseLengthToSeconds(a.Length) > 0);
  const byLength = [...withLength].sort((a, b) => parseLengthToSeconds(a.Length) - parseLengthToSeconds(b.Length));
  const shortest = byLength[0];
  const longest = byLength[byLength.length - 1];

  const highestRated = [...albums].sort((a, b) => b.Rating - a.Rating)[0];
  const lowestRated = [...albums].sort((a, b) => a.Rating - b.Rating)[0];

  const avgRating = Math.round((albums.reduce((s, a) => s + a.Rating, 0) / albums.length) * 10) / 10;

  const artistCounts: Record<string, number> = {};
  albums.forEach((a) => {
    artistCounts[a.Artist] = (artistCounts[a.Artist] || 0) + 1;
  });
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];

  return { oldest, newest, shortest, longest, highestRated, lowestRated, avgRating, topArtist };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="glass-panel rounded-2xl p-4 border border-white/10 flex gap-3 items-start hover:border-[#bc13fe]/40 transition-all duration-300 group">
    <div className="text-[#bc13fe] mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0">{icon}</div>
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
        animate={{ width: `${(avg / max) * 100}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
    <p className="text-[10px] text-white/30 mt-0.5">{count} album{count !== 1 ? 's' : ''}</p>
  </div>
);

// ─── Interactive Album List ───────────────────────────────────────────────────
const AlbumList = ({ albums }: { albums: Album[] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  const filteredAndSorted = useMemo(() => {
    // Filter
    const query = searchQuery.toLowerCase();
    let result = albums.filter((a) => {
      const matchTitle = String(a.Album).toLowerCase().includes(query);
      const matchArtist = a.Artist.toLowerCase().includes(query);
      const matchGenre = a.Genre.toLowerCase().includes(query);
      return matchTitle || matchArtist || matchGenre;
    });

    // Sort
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
    <div className="glass-panel rounded-3xl border border-white/10 neon-border overflow-hidden flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search albums, artists, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#bc13fe]/50 focus:ring-1 focus:ring-[#bc13fe]/50 transition-all"
            />
          </div>
          
          <div className="relative w-full sm:w-auto min-w-[160px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-8 text-sm text-white focus:outline-none focus:border-[#bc13fe]/50 focus:ring-1 focus:ring-[#bc13fe]/50 transition-all cursor-pointer"
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
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#bc13fe] flex items-center gap-2">
            <Disc3 className="w-4 h-4" /> Collection
          </h3>
          <p className="text-white/40 text-xs font-mono">{filteredAndSorted.length} results</p>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredAndSorted.length > 0 ? (
            filteredAndSorted.map((album, idx) => {
              const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
              // Find global rank for "rating" sort only, else hide it
              const isRatingSort = sortBy === 'rating';
              const globalRank = isRatingSort ? albums.findIndex(a => a.Album === album.Album) + 1 : null;

              return (
                <motion.div
                  key={album.Album}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx > 20 ? 0 : idx * 0.05 }}
                  className="glass-panel p-3 rounded-2xl flex gap-4 items-center group hover:bg-white/10 transition-colors"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0">
                    {hasCover ? (
                      <img
                        src={album.CoverArt}
                        alt={`${album.Album} cover`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
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
                    <p className="text-xs sm:text-sm text-[#bc13fe] truncate">{album.Artist}</p>
                    
                    <div className="flex items-center gap-3 mt-1.5 hidden sm:flex">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#bc13fe] fill-[#bc13fe]" />
                        <span className="text-xs font-bold text-white">{album.Rating.toFixed(1)}</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <div className="flex items-center gap-1 text-white/50 text-xs">
                        <Calendar className="w-3 h-3" />
                        <span>{album['Release Year']}</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-[10px] uppercase tracking-wider text-white/40 truncate max-w-[120px]">
                        {album.Genre.split(',')[0]}
                      </span>
                    </div>
                  </div>

                  {album.AppleMusicLink && (
                    <a
                      href={album.AppleMusicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 sm:px-4 sm:py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-[#bc13fe]/50 hover:bg-[#bc13fe]/10 transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4 sm:hidden" />
                      <span className="hidden sm:inline text-xs font-bold">Listen</span>
                    </a>
                  )}
                </motion.div>
              );
            })
          ) : (
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

// ─── Main Component ───────────────────────────────────────────────────────────
const MusicDashboard = () => {
  const albums = rawAlbumData as Album[];
  
  // Keep original sorted array for stats purposes if needed, 
  // but AlbumList handles its own sorting
  const baseSortedAlbums = useMemo(
    () => [...albums].sort((a, b) => b.Rating - a.Rating),
    [albums]
  );

  const topGenres = useMemo(() => computeTopGenres(albums), [albums]);
  const maxGenreAvg = topGenres[0]?.avg ?? 10;

  const stats = useMemo(() => computeStats(albums), [albums]);

  return (
    <div className="glass-panel p-6 rounded-3xl neon-border overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Music className="text-[#bc13fe]" />
            Music Taste Dashboard
          </h3>
          <p className="text-white/40 text-sm mt-1">{albums.length} albums rated · powered by personal data</p>
        </div>
      </div>

      {/* 3-segment grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── BIG: Interactive Album List ── */}
        <div className="lg:col-span-7 flex flex-col h-[950px]">
          <AlbumList albums={baseSortedAlbums} />
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-5 flex flex-col gap-5 h-full">

          {/* Small section 1: Top Genres */}
          <div className="glass-panel rounded-3xl border border-white/10 p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#bc13fe]" />
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Top Genres by Avg Rating</h4>
            </div>
            <div className="space-y-3">
              {topGenres.map((g, i) => (
                <GenreBar
                  key={g.genre}
                  genre={g.genre}
                  avg={g.avg}
                  count={g.count}
                  max={maxGenreAvg}
                  color={NEON_COLORS[i % NEON_COLORS.length]}
                />
              ))}
            </div>
          </div>

          {/* Small section 2: Interesting Stats */}
          <div className="glass-panel rounded-3xl border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-[#bc13fe]" />
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Interesting Stats</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              <StatCard
                icon={<Trophy className="w-4 h-4" />}
                label="Highest Rated"
                value={String(stats.highestRated.Album)}
                sub={`${stats.highestRated.Artist} · ${stats.highestRated.Rating}/10`}
              />
              <StatCard
                icon={<Star className="w-4 h-4" />}
                label="Avg Rating"
                value={`${stats.avgRating} / 10`}
                sub={`across ${albums.length} albums`}
              />
              <StatCard
                icon={<Calendar className="w-4 h-4" />}
                label="Oldest Album"
                value={String(stats.oldest.Album)}
                sub={`${stats.oldest.Artist} · ${stats.oldest['Release Year']}`}
              />
              <StatCard
                icon={<Calendar className="w-4 h-4" />}
                label="Newest Album"
                value={String(stats.newest.Album)}
                sub={`${stats.newest.Artist} · ${stats.newest['Release Year']}`}
              />
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="Shortest Album"
                value={String(stats.shortest.Album)}
                sub={`${stats.shortest.Artist} · ${formatSeconds(parseLengthToSeconds(stats.shortest.Length))}`}
              />
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="Longest Album"
                value={String(stats.longest.Album)}
                sub={`${stats.longest.Artist} · ${formatSeconds(parseLengthToSeconds(stats.longest.Length))}`}
              />
              <StatCard
                icon={<Disc3 className="w-4 h-4" />}
                label="Most Listened"
                value={stats.topArtist[0]}
                sub={`${stats.topArtist[1]} albums rated`}
              />
              <StatCard
                icon={<Music className="w-4 h-4" />}
                label="Lowest Rated"
                value={String(stats.lowestRated.Album)}
                sub={`${stats.lowestRated.Artist} · ${stats.lowestRated.Rating}/10`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicDashboard;
