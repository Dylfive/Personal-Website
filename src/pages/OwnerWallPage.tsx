import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Music, ExternalLink, Star, Calendar, Clock,
  Trophy, Disc3, Search, ArrowUpDown, BarChart2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AlbumEntry } from '../types/album';
import rawAlbumData from '../data/Album-Data.json';

// ─── Copied helpers (same as MusicDashboard — kept local to avoid coupling) ───

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

function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

const NEON_COLORS = ['#f5a623', '#5b7fa6', '#7a9ec0', '#d97706', '#22c55e', '#f59e0b', '#ef4444'];

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
  const avgRating = Math.round((albums.reduce((s, a) => s + a.Rating, 0) / albums.length) * 10) / 10;
  const artistCounts: Record<string, number> = {};
  albums.forEach((a) => { artistCounts[a.Artist] = (artistCounts[a.Artist] || 0) + 1; });
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
  return { oldest, newest, shortest, longest, highestRated, lowestRated, avgRating, topArtist };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="glass-panel rounded-2xl p-4 border border-white/10 flex gap-3 items-start hover:border-accent-amber/40 transition-all duration-300 group">
    <div className="text-accent-amber mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0">{icon}</div>
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

// ─── Ratings Distribution ─────────────────────────────────────────────────────
function computeRatingDistribution(albums: AlbumEntry[]) {
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 100; i++) {
    const val = (i / 10).toFixed(1);
    buckets[val] = 0;
  }
  albums.forEach((a) => {
    const rounded = Math.max(0, Math.min(10, Math.round(a.Rating * 10) / 10));
    const val = rounded.toFixed(1);
    if (buckets[val] !== undefined) buckets[val] += 1;
  });
  return Object.entries(buckets)
    .map(([ratingStr, count]) => ({ rating: parseFloat(ratingStr), ratingStr, count, isInteger: ratingStr.endsWith('.0') }))
    .sort((a, b) => a.rating - b.rating);
}

const RatingsChart = ({ albums }: { albums: AlbumEntry[] }) => {
  const data = useMemo(() => computeRatingDistribution(albums), [albums]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const BAR_AREA_H = 140;

  useEffect(() => {
    if (!scrollRef.current) return;
    const BAR_W = 30;
    const idx = data.findIndex((d) => d.rating >= 6.5);
    if (idx !== -1) scrollRef.current.scrollLeft = idx * BAR_W;
  }, [data]);

  const barColor = (r: number) => {
    if (r < 4.0) return '#ef4444';
    if (r < 6.0) return '#f59e0b';
    if (r < 7.5) return '#3b82f6';
    if (r < 8.5) return '#06b6d4';
    if (r < 9.5) return '#d946ef';
    return '#f5a623';
  };

  return (
    <div className="glass-panel rounded-3xl border border-white/10 p-5">
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="w-4 h-4 text-accent-amber shrink-0" />
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/90 leading-none">Rating Distribution</h4>
          <p className="text-[11px] text-white/35 mt-0.5">Scroll or drag to explore</p>
        </div>
      </div>
      <div
        ref={scrollRef}
        onMouseDown={(e) => { isDraggingRef.current = true; startXRef.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0); scrollLeftRef.current = scrollRef.current?.scrollLeft ?? 0; }}
        onMouseMove={(e) => { if (!isDraggingRef.current || !scrollRef.current) return; e.preventDefault(); scrollRef.current.scrollLeft = scrollLeftRef.current - (e.pageX - (scrollRef.current.offsetLeft) - startXRef.current) * 1.5; }}
        onMouseUp={() => { isDraggingRef.current = false; }}
        onMouseLeave={() => { isDraggingRef.current = false; }}
        onWheel={(e) => { if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY; }}
        className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex items-end gap-1 min-w-max px-1 pb-1" style={{ height: `${BAR_AREA_H + 36 + 28}px` }}>
          {data.map(({ rating, ratingStr, count, isInteger }) => {
            const color = barColor(rating);
            const barPx = maxCount > 0 ? Math.round((count / maxCount) * BAR_AREA_H) : 0;
            return (
              <div key={ratingStr} className="w-7 shrink-0 flex flex-col items-center group rounded-lg" style={{ height: `${BAR_AREA_H + 36 + 28}px` }}>
                <div className="h-9 flex items-center justify-center">
                  {count > 0 ? (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none" style={{ background: color, color: '#fff', boxShadow: `0 0 8px ${color}80` }}>{count}</span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                  )}
                </div>
                <div className="w-full flex items-end" style={{ height: `${BAR_AREA_H}px` }}>
                  <motion.div className="w-full rounded-t-sm relative overflow-hidden" style={{ height: barPx > 0 ? `${barPx}px` : '2px', background: count > 0 ? color : 'rgba(255,255,255,0.04)', boxShadow: count > 0 ? `0 0 10px ${color}70` : 'none' }} initial={{ scaleY: 0, originY: 1 }} animate={{ scaleY: 1 }} transition={{ duration: 0.45, ease: 'easeOut', delay: Math.min(rating * 0.016, 0.3) }}>
                    {count > 0 && <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />}
                  </motion.div>
                </div>
                <div className="h-7 flex items-center justify-center w-full">
                  <span className="font-mono text-[10px] leading-none" style={{ fontWeight: isInteger ? 800 : count > 0 ? 500 : 400, color: isInteger ? '#ffffff' : count > 0 ? color : 'rgba(255,255,255,0.2)' }}>{ratingStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] text-white/30 font-mono">← 0.0</span>
        <span className="text-[10px] text-white/30 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-amber inline-block animate-pulse" />
          Scroll or drag to explore
        </span>
        <span className="text-[10px] text-white/30 font-mono">10.0 →</span>
      </div>
    </div>
  );
};

// ─── Album List (read-only) ───────────────────────────────────────────────────
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
      return matchTitle || matchArtist || matchGenre || matchRating;
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
            <input type="text" placeholder="Search albums, artists, genres..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/50 transition-all" />
          </div>
          <div className="relative w-full sm:w-auto min-w-[160px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="w-full appearance-none bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-8 text-sm text-white focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/50 transition-all cursor-pointer">
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
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-accent-amber flex items-center gap-2">
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
                  <p className="text-xs sm:text-sm text-accent-amber truncate">{album.Artist}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                    <div className="flex items-center gap-1"><Star className="w-3 h-3 text-accent-amber fill-accent-amber" /><span className="text-xs font-bold text-white">{album.Rating.toFixed(1)}</span></div>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1 text-white/50 text-xs"><Calendar className="w-3 h-3" /><span>{album['Release Year']}</span></div>
                    <span className="w-1 h-1 rounded-full bg-white/20 hidden xs:inline-block" />
                    <span className="text-[10px] uppercase tracking-wider text-white/40 truncate max-w-[100px] hidden xs:inline">{album.Genre.split(',')[0]}</span>
                  </div>
                </div>
                {album.AppleMusicLink && (
                  <a href={album.AppleMusicLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2 sm:px-4 sm:py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-accent-amber/50 hover:bg-accent-amber/10 transition-all duration-200">
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OwnerWallPage() {
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Look up owner's user_id by email via user_profiles join
        // Strategy: find owner's profile by fetching all user_albums for profiles
        // where we can identify via a known email lookup.
        // Since we can't expose emails directly, we use a fallback to raw JSON data
        // which is already owned by Dylan. For Supabase, we query user_albums
        // directly for the owner's user_id using a metadata approach:
        // We attempt to find the owner via the public profile with the reserved nickname 'Dylan'.
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, nickname')
          .ilike('nickname', 'Dylan')
          .limit(1);

        let ownerUserId: string | null = profiles?.[0]?.user_id ?? null;

        // If no profile found, try to get albums from raw JSON (owner's public data)
        if (!ownerUserId) {
          // Fall back to published JSON data from GitHub
          try {
            const res = await fetch(
              'https://raw.githubusercontent.com/Dylfive/Personal-Website/main/src/data/Album-Data.json'
            );
            if (res.ok) {
              const raw = await res.json();
              setAlbums(raw as AlbumEntry[]);
            } else {
              setAlbums(rawAlbumData as AlbumEntry[]);
            }
          } catch {
            setAlbums(rawAlbumData as AlbumEntry[]);
          }
          setLoading(false);
          return;
        }

        // Fetch owner's albums from Supabase
        const { data, error } = await supabase
          .from('user_albums')
          .select('*')
          .eq('user_id', ownerUserId)
          .order('rating', { ascending: false });

        if (!error && data && data.length > 0) {
          setAlbums(
            data.map((item: any) => ({
              Album: item.album,
              Artist: item.artist,
              Rating: Number(item.rating),
              Genre: item.genre ?? '',
              'Release Year': Number(item.release_year ?? 0),
              Length: item.length ?? '',
              CoverArt: item.cover_art ?? '',
              AppleMusicLink: item.apple_music_link ?? '',
            }))
          );
        } else {
          setAlbums(rawAlbumData as AlbumEntry[]);
        }
      } catch {
        setAlbums(rawAlbumData as AlbumEntry[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const baseSortedAlbums = useMemo(
    () => [...albums].sort((a, b) => b.Rating - a.Rating),
    [albums]
  );

  const topGenres = useMemo(() => computeTopGenres(albums), [albums]);
  const maxGenreAvg = topGenres[0]?.avg ?? 10;
  const stats = useMemo(() => (albums.length > 0 ? computeStats(albums) : null), [albums]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
          className="w-10 h-10 border-2 border-white/20 border-t-accent-amber rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-10 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-accent-amber/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-slate/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 max-w-6xl">
        {/* Hero Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
            <span className="text-xs text-accent-amber/80 font-bold uppercase tracking-wider">
              Public Collection
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-black mb-3">
            Dylan's <span className="gradient-text">Wall</span>
          </h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
            A curated collection of every album I've rated — {albums.length} and counting.
          </p>
        </div>

        {/* Dashboard layout */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-accent-amber/20 transition-all duration-300 overflow-hidden">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Music className="text-accent-amber" />
                Music Taste Dashboard
              </h3>
              <p className="text-white/40 text-sm mt-1">
                {albums.length} albums rated · Dylan's personal collection
              </p>
            </div>
          </div>

          {/* 3-segment grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Album List */}
            <div className="lg:col-span-7 flex flex-col h-[950px]">
              <AlbumList albums={baseSortedAlbums} />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 flex flex-col gap-5 h-full">
              {/* Top Genres */}
              <div className="glass-panel rounded-3xl border border-white/10 p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-accent-amber" />
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Top Genres by Avg Rating</h4>
                </div>
                <div className="space-y-3">
                  {topGenres.map((g, i) => (
                    <GenreBar key={g.genre} genre={g.genre} avg={g.avg} count={g.count} max={maxGenreAvg} color={NEON_COLORS[i % NEON_COLORS.length]} />
                  ))}
                </div>
              </div>

              {/* Interesting Stats */}
              {stats && (
                <div className="glass-panel rounded-3xl border border-white/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4 text-accent-amber" />
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Interesting Stats</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                    <StatCard icon={<Trophy className="w-4 h-4" />} label="Highest Rated" value={String(stats.highestRated.Album)} sub={`${stats.highestRated.Artist} · ${stats.highestRated.Rating}/10`} />
                    <StatCard icon={<Star className="w-4 h-4" />} label="Avg Rating" value={`${stats.avgRating} / 10`} sub={`across ${albums.length} albums`} />
                    <StatCard icon={<Calendar className="w-4 h-4" />} label="Oldest Album" value={String(stats.oldest.Album)} sub={`${stats.oldest.Artist} · ${stats.oldest['Release Year']}`} />
                    <StatCard icon={<Calendar className="w-4 h-4" />} label="Newest Album" value={String(stats.newest.Album)} sub={`${stats.newest.Artist} · ${stats.newest['Release Year']}`} />
                    {stats.shortest && <StatCard icon={<Clock className="w-4 h-4" />} label="Shortest Album" value={String(stats.shortest.Album)} sub={`${stats.shortest.Artist} · ${formatSeconds(parseLengthToSeconds(stats.shortest.Length))}`} />}
                    {stats.longest && <StatCard icon={<Clock className="w-4 h-4" />} label="Longest Album" value={String(stats.longest.Album)} sub={`${stats.longest.Artist} · ${formatSeconds(parseLengthToSeconds(stats.longest.Length))}`} />}
                    <StatCard icon={<Disc3 className="w-4 h-4" />} label="Most Listened" value={stats.topArtist[0]} sub={`${stats.topArtist[1]} albums rated`} />
                    <StatCard icon={<Music className="w-4 h-4" />} label="Lowest Rated" value={String(stats.lowestRated.Album)} sub={`${stats.lowestRated.Artist} · ${stats.lowestRated.Rating}/10`} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ratings Distribution — full width */}
          <div className="mt-5">
            <RatingsChart albums={albums} />
          </div>
        </div>
      </div>
    </div>
  );
}
