import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Music, ExternalLink, Star, Calendar, Clock, Trophy, Disc3, Search, ArrowUpDown, BarChart2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserAlbums, seedUserAlbums, clearUserAlbums } from '../lib/albumStore';

// ─── Types ────────────────────────────────────────────────────────────────────
import type { AlbumEntry as Album } from '../types/album';

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
    // If hours > 3, it's highly likely it's actually minutes from the old MM:SS:00 format
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

// ─── Ratings Distribution Chart ──────────────────────────────────────────────
function computeRatingDistribution(albums: Album[]) {
  // Generate 0.1-step decimal buckets from 0.0 to 10.0 (101 total buckets)
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 100; i++) {
    const val = (i / 10).toFixed(1);
    buckets[val] = 0;
  }

  albums.forEach((a) => {
    const rounded = Math.max(0, Math.min(10, Math.round(a.Rating * 10) / 10));
    const val = rounded.toFixed(1);
    if (buckets[val] !== undefined) {
      buckets[val] += 1;
    }
  });

  return Object.entries(buckets)
    .map(([ratingStr, count]) => ({
      rating: parseFloat(ratingStr),
      ratingStr,
      count,
      isInteger: ratingStr.endsWith('.0'),
    }))
    .sort((a, b) => a.rating - b.rating);
}

const RatingsChart = ({ albums, onRatingClick }: { albums: Album[], onRatingClick?: (r: string) => void }) => {
  // ── data & refs ──────────────────────────────────────────────────────────
  const data = useMemo(() => computeRatingDistribution(albums), [albums]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  // Auto-scroll to ~6.5 on mount so populated area is visible first
  useEffect(() => {
    if (!scrollRef.current) return;
    const BAR_W = 30; // w-7 (28px) + gap-1 (2px approx)
    const idx = data.findIndex((d) => d.rating >= 6.5);
    if (idx !== -1) scrollRef.current.scrollLeft = idx * BAR_W;
  }, [data]);

  // ── drag-to-pan ──────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const walk = e.pageX - scrollRef.current.offsetLeft - startXRef.current;
    dragDistanceRef.current += Math.abs(walk);
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk * 1.5;
  };
  const onDragEnd = () => { isDraggingRef.current = false; };

  // redirect vertical wheel → horizontal scroll
  const onWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
  };

  // ── nav helpers ──────────────────────────────────────────────────────────
  const scrollToRating = (target: number) => {
    if (!scrollRef.current) return;
    const BAR_W = 30;
    const idx = data.findIndex((d) => d.rating >= target);
    if (idx !== -1) scrollRef.current.scrollTo({ left: idx * BAR_W, behavior: 'smooth' });
  };
  const nudge = (px: number) => scrollRef.current?.scrollBy({ left: px, behavior: 'smooth' });

  // ── colour scale ─────────────────────────────────────────────────────────
  const barColor = (r: number) => {
    if (r < 4.0) return '#ef4444';
    if (r < 6.0) return '#f59e0b';
    if (r < 7.5) return '#3b82f6';
    if (r < 8.5) return '#06b6d4';
    if (r < 9.5) return '#d946ef';
    return '#bc13fe';
  };

  const JUMP = [
    { label: '0',  r: 0   },
    { label: '5',  r: 5.0 },
    { label: '7',  r: 7.0 },
    { label: '8',  r: 8.0 },
    { label: '9',  r: 9.0 },
    { label: '10', r: 10.0 },
  ];

  // Fixed pixel height for bar area — heights are computed in px, not %, for reliable scaling
  const BAR_AREA_H = 140;

  return (
    <div className="glass-panel rounded-3xl border border-white/10 p-5">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="w-4 h-4 text-[#bc13fe] shrink-0" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/90 leading-none">
              Rating Distribution
            </h4>
            <p className="text-[11px] text-white/35 mt-0.5">Scroll or drag to explore</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented jump strip */}
          <div
            className="flex items-center rounded-xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="text-[9px] uppercase font-black tracking-widest text-white/25 pl-3 pr-2 select-none">
              Jump
            </span>
            {JUMP.map(({ label, r }) => (
              <React.Fragment key={label}>
                <div className="w-px h-4 bg-white/10" />
                <button
                  onClick={() => scrollToRating(r)}
                  className="px-3 py-1.5 text-[11px] font-mono font-semibold text-white/45 hover:text-white hover:bg-white/5 transition-all duration-150"
                >
                  {label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Arrow buttons */}
          <button
            onClick={() => nudge(-300)}
            aria-label="Scroll left"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-[#bc13fe]/50 hover:bg-[#bc13fe]/10 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => nudge(300)}
            aria-label="Scroll right"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-[#bc13fe]/50 hover:bg-[#bc13fe]/10 transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable chart ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Inner row: count pill + bar + label stacked per bucket */}
        <div
          className="flex items-end gap-1 min-w-max px-1 pb-1"
          style={{ height: `${BAR_AREA_H + 36 + 28}px` }} // pill row + bar area + label row
          aria-label="Ratings distribution bar chart"
        >
          {data.map(({ rating, ratingStr, count, isInteger }) => {
            const color = barColor(rating);
            const barPx = maxCount > 0 ? Math.round((count / maxCount) * BAR_AREA_H) : 0;

            return (
              <div
                key={ratingStr}
                className={`w-7 shrink-0 flex flex-col items-center group rounded-lg transition-colors ${count > 0 ? 'cursor-pointer hover:bg-white/5' : ''}`}
                style={{ height: `${BAR_AREA_H + 36 + 28}px` }}
                onClick={() => {
                  if (count > 0 && dragDistanceRef.current < 5 && onRatingClick) {
                    onRatingClick(ratingStr);
                  }
                }}
              >
                {/* Always-visible count pill (36 px zone) */}
                <div className="h-9 flex items-center justify-center">
                  {count > 0 ? (
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none"
                      style={{
                        background: color,
                        color: '#fff',
                        boxShadow: `0 0 8px ${color}80`,
                      }}
                    >
                      {count}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                  )}
                </div>

                {/* Bar (BAR_AREA_H px zone, aligns from bottom) */}
                <div className="w-full flex items-end" style={{ height: `${BAR_AREA_H}px` }}>
                  <motion.div
                    className="w-full rounded-t-sm relative overflow-hidden"
                    style={{
                      height: barPx > 0 ? `${barPx}px` : '2px',
                      background: count > 0 ? color : 'rgba(255,255,255,0.04)',
                      boxShadow: count > 0 ? `0 0 10px ${color}70` : 'none',
                    }}
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      duration: 0.45,
                      ease: 'easeOut',
                      delay: Math.min(rating * 0.016, 0.3),
                    }}
                  >
                    {count > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                    )}
                  </motion.div>
                </div>

                {/* X-axis label (28 px zone) */}
                <div className="h-7 flex items-center justify-center w-full">
                  <span
                    className="font-mono text-[10px] leading-none"
                    style={{
                      fontWeight: isInteger ? 800 : count > 0 ? 500 : 400,
                      color: isInteger
                        ? '#ffffff'
                        : count > 0
                        ? color
                        : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {ratingStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] text-white/30 font-mono">← 0.0</span>
        <span className="text-[10px] text-white/30 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#bc13fe] inline-block animate-pulse" />
          Scroll or drag to explore
        </span>
        <span className="text-[10px] text-white/30 font-mono">10.0 →</span>
      </div>
    </div>
  );
};


// ─── Interactive Album List ───────────────────────────────────────────────────
const AlbumList = ({ albums, searchQuery, setSearchQuery }: { albums: Album[], searchQuery: string, setSearchQuery: (s: string) => void }) => {
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  const filteredAndSorted = useMemo(() => {
    // Filter
    const query = searchQuery.toLowerCase();
    let result = albums.filter((a) => {
      const matchTitle = String(a.Album).toLowerCase().includes(query);
      const matchArtist = a.Artist.toLowerCase().includes(query);
      const matchGenre = a.Genre.toLowerCase().includes(query);
      const matchRating = a.Rating.toFixed(1).includes(query) || String(a.Rating).includes(query);
      return matchTitle || matchArtist || matchGenre || matchRating;
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
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#bc13fe] fill-[#bc13fe]" />
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

interface MusicDashboardProps {
  onAddAlbumClick?: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const MusicDashboard: React.FC<MusicDashboardProps> = ({ onAddAlbumClick }) => {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const data = await getUserAlbums(user?.id);
      setAlbums(data);
    } catch (err) {
      console.error('Failed to load user albums', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, [user?.id]);

  const handleSeed = async () => {
    if (!user?.id) return;
    setLoading(true);
    const seeded = await seedUserAlbums(user.id);
    setAlbums(seeded);
    setLoading(false);
  };

  const handleClear = async () => {
    if (!user?.id) return;
    if (!window.confirm('Are you sure you want to clear your personal album collection?')) return;
    setLoading(true);
    await clearUserAlbums(user.id);
    setAlbums([]);
    setLoading(false);
  };

  // Keep original sorted array for stats purposes if needed, 
  // but AlbumList handles its own sorting
  const baseSortedAlbums = useMemo(
    () => [...albums].sort((a, b) => b.Rating - a.Rating),
    [albums]
  );

  const topGenres = useMemo(() => computeTopGenres(albums), [albums]);
  const maxGenreAvg = topGenres[0]?.avg ?? 10;

  const stats = useMemo(() => computeStats(albums), [albums]);

  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [secretFlash, setSecretFlash] = useState(false);

  const handleSecretTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setSecretFlash(true);
      setTimeout(() => {
        setSecretFlash(false);
        navigate('/intake');
      }, 600);
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
  };

  if (loading) {
    return (
      <div className="glass-panel p-16 rounded-3xl neon-border flex flex-col items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
          className="w-10 h-10 border-2 border-white/20 border-t-neon-purple rounded-full mb-4"
        />
        <p className="text-white/40 text-sm font-medium">Loading collection…</p>
      </div>
    );
  }

  // ── Empty State for Authenticated Users with 0 Albums ──
  if (user && albums.length === 0) {
    return (
      <div className="glass-panel p-8 sm:p-14 rounded-3xl neon-border text-center flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-20 h-20 rounded-3xl bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center mb-6">
          <Disc3 className="w-10 h-10 text-neon-purple animate-pulse" />
        </div>
        <h3 className="text-3xl font-black mb-3">Your Collection is Empty</h3>
        <p className="text-white/50 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
          Logged in as <span className="text-white font-semibold">{user.email}</span>. Start building your own rated album collection or import the starter dataset!
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {onAddAlbumClick ? (
            <button
              onClick={onAddAlbumClick}
              className="btn-primary px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Your First Album
            </button>
          ) : (
            <button
              onClick={() => navigate('/intake')}
              className="btn-primary px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Your First Album
            </button>
          )}
          <button
            onClick={handleSeed}
            className="px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 font-bold text-white/80 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            Import Starter List (171 albums)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-3xl neon-border overflow-hidden">
      {/* Secret flash overlay */}
      {secretFlash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-full bg-neon-purple/90 text-white font-bold text-lg shadow-[0_0_40px_rgba(188,19,254,0.8)] animate-ping-once">
            🔓 Access Granted
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Music
              className="text-[#bc13fe] cursor-pointer select-none"
              onClick={handleSecretTap}
              onTouchEnd={(e) => { e.preventDefault(); handleSecretTap(); }}
              role="button"
              tabIndex={0}
              aria-label="Admin Settings"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSecretTap(); }}
            />
            Music Taste Dashboard
          </h3>
          <p className="text-white/40 text-sm mt-1">
            {albums.length} albums rated {user ? `· ${user.email}'s collection` : '· powered by personal data'}
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              title="Import 171 starter albums"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/60 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
              Import Starter Data
            </button>
            <button
              onClick={handleClear}
              title="Clear your collection"
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 3-segment grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── BIG: Interactive Album List ── */}
        <div className="lg:col-span-7 flex flex-col h-[950px]">
          <AlbumList albums={baseSortedAlbums} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
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

      {/* Ratings Distribution — full width below */}
      <div className="mt-5">
        <RatingsChart
          albums={albums}
          onRatingClick={(ratingStr) => {
            setSearchQuery(ratingStr);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>
    </div>
  );
};

export default MusicDashboard;
