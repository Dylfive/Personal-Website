import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Music, ExternalLink, Star, Calendar, Clock,
  Trophy, Disc3, Search, ArrowUpDown, BarChart2, Plus, Pencil,
  Mic2, GripVertical, Palette, Eye, RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserAlbums, updateUserAlbum, updateUserAlbumRankOrders, restoreUserAlbumsFromSeed } from '../lib/albumStore';
import { useTheme } from '../contexts/ThemeContext';
import ThemePicker from './ThemePicker';

// ─── Types ────────────────────────────────────────────────────────────────────
import type { AlbumEntry as Album } from '../types/album';

type SortOption = 'rating' | 'year_desc' | 'year_asc' | 'title' | 'artist';

interface ListInfoToggles {
  topSong: boolean;
  year: boolean;
  genre: boolean;
  length: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseLengthToSeconds(length: string): number {
  const parts = length.split(':').map(Number);
  if (parts.length === 3) {
    const asHMS = parts[0] * 3600 + parts[1] * 60 + parts[2];
    const asMS  = parts[0] * 60  + parts[1];
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

// ─── Stats ────────────────────────────────────────────────────────────────────
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

  const avgRating = Math.round((albums.reduce((s, a) => s + a.Rating, 0) / (albums.length || 1)) * 10) / 10;

  const artistCounts: Record<string, number> = {};
  albums.forEach((a) => {
    artistCounts[a.Artist] = (artistCounts[a.Artist] || 0) + 1;
  });
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

// ─── Ratings Distribution Chart ──────────────────────────────────────────────
function computeRatingDistribution(albums: Album[]) {
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
    .map(([ratingStr, count]) => ({
      rating: parseFloat(ratingStr),
      ratingStr,
      count,
      isInteger: ratingStr.endsWith('.0'),
    }))
    .sort((a, b) => a.rating - b.rating);
}

const RatingsChart = ({ albums, onRatingClick }: { albums: Album[], onRatingClick?: (r: string) => void }) => {
  const data = useMemo(() => computeRatingDistribution(albums), [albums]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  useEffect(() => {
    if (!scrollRef.current) return;
    const BAR_W = 30;
    const idx = data.findIndex((d) => d.rating >= 6.5);
    if (idx !== -1) scrollRef.current.scrollLeft = idx * BAR_W;
  }, [data]);

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

  const onWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
  };

  const scrollToRating = (target: number) => {
    if (!scrollRef.current) return;
    const BAR_W = 30;
    const idx = data.findIndex((d) => d.rating >= target);
    if (idx !== -1) scrollRef.current.scrollTo({ left: idx * BAR_W, behavior: 'smooth' });
  };
  const nudge = (px: number) => scrollRef.current?.scrollBy({ left: px, behavior: 'smooth' });

  const barColor = (r: number) => {
    if (r < 4.0) return '#ef4444';
    if (r < 6.0) return '#f59e0b';
    if (r < 7.5) return '#3b82f6';
    if (r < 8.5) return '#06b6d4';
    if (r < 9.5) return '#d946ef';
    return 'var(--accent-primary)';
  };

  const JUMP = [
    { label: '0',  r: 0   },
    { label: '5',  r: 5.0 },
    { label: '7',  r: 7.0 },
    { label: '8',  r: 8.0 },
    { label: '9',  r: 9.0 },
    { label: '10', r: 10.0 },
  ];

  const BAR_AREA_H = 140;

  return (
    <div className="glass-panel rounded-3xl border border-white/10 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="w-4 h-4 text-[color:var(--accent-primary)] shrink-0" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white/90 leading-none">
              Rating Distribution
            </h4>
            <p className="text-[11px] text-white/35 mt-0.5">Scroll or drag to explore</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
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

          <button
            onClick={() => nudge(-300)}
            aria-label="Scroll left"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-[color:var(--accent-primary)]/50 hover:bg-white/5 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => nudge(300)}
            aria-label="Scroll right"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-[color:var(--accent-primary)]/50 hover:bg-white/5 transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

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
        <div className="flex items-end gap-1 min-w-max px-1 pb-1" style={{ height: `${BAR_AREA_H + 36 + 28}px` }}>
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
                <div className="h-9 flex items-center justify-center">
                  {count > 0 ? (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none text-white shadow-sm" style={{ background: color }}>
                      {count}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                  )}
                </div>

                <div className="w-full flex items-end" style={{ height: `${BAR_AREA_H}px` }}>
                  <motion.div
                    className="w-full rounded-t-sm relative overflow-hidden"
                    style={{
                      height: barPx > 0 ? `${barPx}px` : '2px',
                      background: count > 0 ? color : 'rgba(255,255,255,0.04)',
                    }}
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut', delay: Math.min(rating * 0.016, 0.3) }}
                  >
                    {count > 0 && <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />}
                  </motion.div>
                </div>

                <div className="h-7 flex items-center justify-center w-full">
                  <span
                    className="font-mono text-[10px] leading-none"
                    style={{
                      fontWeight: isInteger ? 800 : count > 0 ? 500 : 400,
                      color: isInteger ? '#ffffff' : count > 0 ? color : 'rgba(255,255,255,0.2)',
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
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] text-white/30 font-mono">← 0.0</span>
        <span className="text-[10px] text-white/30 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent-primary)] inline-block animate-pulse" />
          Scroll or drag to explore
        </span>
        <span className="text-[10px] text-white/30 font-mono">10.0 →</span>
      </div>
    </div>
  );
};

// ─── Inline Title/Artist Editor ───────────────────────────────────────────────
const InlineAlbumEditor = ({
  album,
  onSave,
  onCancel,
}: {
  album: Album;
  onSave: (updated: Album) => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState(String(album.Album));
  const [artist, setArtist] = useState(album.Artist);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;
    onSave({ ...album, Album: title.trim(), Artist: artist.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-2 p-1" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-[color:var(--accent-primary)]"
        placeholder="Album Title"
        autoFocus
      />
      <input
        type="text"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-[color:var(--accent-primary)] focus:outline-none focus:border-[color:var(--accent-primary)]"
        placeholder="Artist Name"
      />
      <div className="flex gap-2 justify-end mt-1">
        <button type="button" onClick={onCancel} className="px-2 py-0.5 text-[10px] text-white/50 hover:text-white">
          Cancel
        </button>
        <button type="submit" className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-[color:var(--accent-primary)] text-white">
          Save
        </button>
      </div>
    </form>
  );
};

// ─── Interactive Album List ───────────────────────────────────────────────────
const AlbumList = ({
  albums,
  searchQuery,
  setSearchQuery,
  onEditAlbum,
  onUpdateAlbums,
}: {
  albums: Album[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  onEditAlbum?: (album: Album) => void;
  onUpdateAlbums?: () => void;
}) => {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [toggles, setToggles] = useState<ListInfoToggles>({
    topSong: true,
    year: true,
    genre: true,
    length: false,
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Find albums tied at the same rating (for drag-to-reorder tiebreaker)
  const tiedGroups = useMemo(() => {
    const map: Record<string, Album[]> = {};
    albums.forEach((a) => {
      const key = a.Rating.toFixed(1);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [albums]);

  // ─── Drag-to-reorder (framer-motion Reorder) ────────────────────────────────
  const albumKeyOf = (a: Album) => `${String(a.Album)}-${a.Artist}`;

  // Order of the album keys currently displayed. Mirrors `filteredAndSorted`
  // until the user drags, at which point Reorder supplies the new order live.
  const [listOrder, setListOrder] = useState<string[]>([]);
  const listOrderRef = useRef<string[]>([]);
  const [persistError, setPersistError] = useState<string | null>(null);

  const ratingOfKey = (key: string): string | null => {
    // Closures read the latest filteredAndSorted at call time (drag handlers
    // run well after render), and with an active reorder search is cleared, so
    // this is the full collection.
    const a = filteredAndSorted.find((x) => albumKeyOf(x) === key);
    return a ? a.Rating.toFixed(1) : null;
  };

  const handleReorder = (newKeys: string[]) => {
    const oldKeys = listOrderRef.current;
    if (newKeys.length !== oldKeys.length || !user?.id) return;
    if (newKeys.every((k, i) => k === oldKeys[i])) return;

    // The moved key is the one whose removal leaves both sequences identical.
    // (A single drag can shift several indices, so compare by relative order.)
    let movedKey: string | null = null;
    for (const k of newKeys) {
      const o = oldKeys.filter((x) => x !== k);
      const n = newKeys.filter((x) => x !== k);
      if (o.length === n.length && o.every((x, i) => x === n[i])) {
        movedKey = k;
        break;
      }
    }
    if (!movedKey) return;

    const rating = ratingOfKey(movedKey);
    if (!rating) return;

    // Respect rating-group boundaries. Reorder lets the user drop anywhere, so
    // clamp the dragged album to the edge of its own rating block instead of
    // rejecting the drop — otherwise moving an album to the top/bottom of a
    // small tie group (its most natural position) would silently do nothing.
    const blockStart = oldKeys.findIndex((k) => ratingOfKey(k) === rating);
    let blockEnd = oldKeys.length - 1;
    for (let i = oldKeys.length - 1; i >= 0; i--) {
      if (ratingOfKey(oldKeys[i]) === rating) {
        blockEnd = i;
        break;
      }
    }
    const origIdx = oldKeys.indexOf(movedKey);
    const dropIdx = newKeys.indexOf(movedKey);
    const finalIdx = Math.max(blockStart, Math.min(dropIdx, blockEnd));
    if (finalIdx === origIdx) return; // clamped back to where it came from

    // Rebuild the order with the moved album at its clamped position.
    const withoutMoved = oldKeys.filter((k) => k !== movedKey);
    const finalKeys = [...withoutMoved];
    finalKeys.splice(finalIdx, 0, movedKey);

    // Apply optimistically so the row glides into place, then persist quietly.
    listOrderRef.current = finalKeys;
    setListOrder(finalKeys);
    void persistReorder(finalKeys, rating);
  };

  const persistReorder = async (orderedKeys: string[], rating: string) => {
    if (!user?.id) return;
    // filteredAndSorted is the exact source of the displayed keys (and equals the
    // full list because reorder is gated to a cleared search), so key lookups
    // are guaranteed to match.
    const ordered = orderedKeys
      .map((key) => filteredAndSorted.find((a) => albumKeyOf(a) === key))
      .filter((a): a is Album => !!a);

    // Contiguous rating group in the new order.
    let groupStart = -1;
    let groupEnd = -1;
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].Rating.toFixed(1) !== rating) continue;
      if (groupStart === -1) groupStart = i;
      groupEnd = i;
    }
    if (groupStart < 0) return;

    // Stored tiebreaker rank per member (null = never set before).
    const storedRankById = new Map<string, number | null>();
    for (let i = groupStart; i <= groupEnd; i++) {
      storedRankById.set(albumKeyOf(ordered[i]), ordered[i].RankOrder ?? null);
    }

    // Persist only members whose rank actually changes (or has never been set).
    const toWrite = ordered.slice(groupStart, groupEnd + 1).flatMap((a, idx) => {
      const newRank = idx + 1;
      if (storedRankById.get(albumKeyOf(a)) === newRank) return [];
      return [{ album: String(a.Album), rankOrder: newRank }];
    });

    if (toWrite.length > 0) {
      // In-place UPDATEs only — never delete+insert — so a failed request can
      // never remove an album; worst case the tie order keeps its old values.
      const ok = await updateUserAlbumRankOrders(user.id, toWrite);
      if (!ok) {
        console.error('Reorder persisted partially — albums are safe, order may need a retry');
        setPersistError("Couldn't save the new order to the server. Check the console for details, then drop it again.");
      } else {
        setPersistError(null);
      }
      onUpdateAlbums?.();
    }
  };

  const toggleField = (key: keyof ListInfoToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
      if (sortBy === 'rating') {
        if (b.Rating !== a.Rating) return b.Rating - a.Rating;
        return (a.RankOrder ?? 999) - (b.RankOrder ?? 999);
      }
      if (sortBy === 'year_desc') return b['Release Year'] - a['Release Year'];
      if (sortBy === 'year_asc') return a['Release Year'] - b['Release Year'];
      if (sortBy === 'title') return String(a.Album).localeCompare(String(b.Album));
      if (sortBy === 'artist') return a.Artist.localeCompare(b.Artist);
      return 0;
    });

    return result;
  }, [albums, searchQuery, sortBy]);

  // Reset display order whenever the underlying list changes (load, edit, sort,
  // search). Reorder is gated to "no search", so this is always the
  // authoritative full order the server should reflect.
  const derivedKeys = useMemo(
    () => filteredAndSorted.map((a) => albumKeyOf(a)),
    [filteredAndSorted]
  );

  useEffect(() => {
    listOrderRef.current = derivedKeys;
    setListOrder(derivedKeys);
  }, [derivedKeys]);

  // Falls back to the derived order on first render to avoid a flicker.
  const orderKeys = listOrder.length > 0 ? listOrder : derivedKeys;

  const handleInlineSave = async (originalAlbumName: string, updated: Album) => {
    if (!user?.id) return;
    await updateUserAlbum(user.id, originalAlbumName, updated);
    setEditingKey(null);
    onUpdateAlbums?.();
  };

  return (
    <div className="glass-panel rounded-3xl border border-white/10 neon-border overflow-hidden flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-6 border-b border-white/10 bg-black/20 space-y-4">
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

        {/* Info View Toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1 mr-1">
            <Eye className="w-3 h-3" /> Display:
          </span>
          <button
            onClick={() => toggleField('topSong')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              toggles.topSong
                ? 'bg-white/15 border-white/30 text-white font-bold'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            🎵 Top Song
          </button>
          <button
            onClick={() => toggleField('year')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              toggles.year
                ? 'bg-white/15 border-white/30 text-white font-bold'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            📅 Year
          </button>
          <button
            onClick={() => toggleField('genre')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              toggles.genre
                ? 'bg-white/15 border-white/30 text-white font-bold'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            🏷️ Genre
          </button>
          <button
            onClick={() => toggleField('length')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              toggles.length
                ? 'bg-white/15 border-white/30 text-white font-bold'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            ⏱️ Length
          </button>
        </div>

        <div className="flex justify-between items-end">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--accent-primary)] flex items-center gap-2">
            <Disc3 className="w-4 h-4" /> Collection
          </h3>
          <p className="text-white/40 text-xs font-mono">{filteredAndSorted.length} results</p>
        </div>
      </div>

      {persistError && (
        <div className="px-6 pb-4 -mt-2">
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {persistError}
          </p>
        </div>
      )}

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
        <Reorder.Group
          as="div"
          axis="y"
          values={orderKeys}
          onReorder={handleReorder}
          className="flex flex-col gap-3"
        >
          {orderKeys.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {orderKeys.map((itemKey) => {
                const album = albums.find((a) => albumKeyOf(a) === itemKey);
                if (!album) return null;
                const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
                const isRatingSort = sortBy === 'rating';
                const globalRank = isRatingSort ? albums.findIndex((a) => a.Album === album.Album && a.Artist === album.Artist) + 1 : null;
                const isEditingThis = editingKey === itemKey;

                const tiedCount = tiedGroups[album.Rating.toFixed(1)]?.length ?? 0;
                const isMoveable = !!user && isRatingSort && !searchQuery && tiedCount > 1 && !isEditingThis;

                return (
                  <Reorder.Item
                    key={itemKey}
                    value={itemKey}
                    dragListener={isMoveable}
                    whileDrag={{ scale: 1.02, opacity: 0.85, zIndex: 30, boxShadow: '0 10px 34px rgba(0,0,0,0.55)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`glass-panel p-3 rounded-2xl flex gap-4 items-center group transition-colors ${
                      isMoveable ? 'cursor-grab active:cursor-grabbing' : 'hover:bg-white/10'
                    }`}
                  >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0">
                    {hasCover ? (
                      <img
                        src={album.CoverArt}
                        alt={`${album.Album} cover`}
                        className="w-full h-full object-cover"
                        draggable={false}
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

                  {/* Info / Inline Editor */}
                  {isEditingThis ? (
                    <InlineAlbumEditor
                      album={album}
                      onSave={(updated) => handleInlineSave(String(album.Album), updated)}
                      onCancel={() => setEditingKey(null)}
                    />
                  ) : (
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4
                        onClick={() => user && setEditingKey(itemKey)}
                        className={`text-base sm:text-lg font-bold text-white truncate ${user ? 'hover:underline cursor-pointer' : ''}`}
                        title={user ? 'Click to edit title & artist' : undefined}
                      >
                        {String(album.Album)}
                      </h4>
                      <p
                        onClick={() => user && setEditingKey(itemKey)}
                        className={`text-xs sm:text-sm text-[color:var(--accent-primary)] truncate ${user ? 'hover:underline cursor-pointer' : ''}`}
                      >
                        {album.Artist}
                      </p>

                      {/* Passive Top Song */}
                      {toggles.topSong && album.TopSong && (
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

                        {toggles.year && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-1 text-white/50 text-xs">
                              <Calendar className="w-3 h-3" />
                              <span>{album['Release Year']}</span>
                            </div>
                          </>
                        )}

                        {toggles.genre && album.Genre && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20 hidden xs:inline-block" />
                            <span className="text-[10px] uppercase tracking-wider text-white/40 truncate max-w-[100px] hidden xs:inline">
                              {album.Genre.split(',')[0]}
                            </span>
                          </>
                        )}

                        {toggles.length && album.Length && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="flex items-center gap-1 text-white/50 text-xs font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{album.Length}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {album.AppleMusicLink && (
                    <a
                      href={album.AppleMusicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      draggable={false}
                      className="flex-shrink-0 p-2 sm:px-4 sm:py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-[color:var(--accent-primary)]/50 hover:bg-white/5 transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4 sm:hidden" />
                      <span className="hidden sm:inline text-xs font-bold">Listen</span>
                    </a>
                  )}

                  {/* Drag affordance — the whole entry moves via Reorder */}
                  {isMoveable && (
                    <span
                      title="Drag this entry to reorder albums tied at this rating"
                      aria-label="Drag to reorder tied albums"
                      className="flex-shrink-0 p-2 rounded-full border border-white/10 text-white/30 cursor-grab active:cursor-grabbing group-hover:text-[color:var(--accent-primary)] group-hover:border-[color:var(--accent-primary)]/40 group-hover:bg-white/5 transition-all duration-200"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                  )}

                  {/* Edit button */}
                  {onEditAlbum && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditAlbum(album); }}
                      title="Edit album"
                      className="flex-shrink-0 p-2 rounded-full border border-white/10 text-white/30 hover:text-[color:var(--accent-primary)] hover:border-[color:var(--accent-primary)]/40 hover:bg-white/5 transition-all duration-200"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </Reorder.Item>
              );
              })}
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/40 w-full">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No albums found.</p>
            </div>
          )}
        </Reorder.Group>
      </div>
    </div>
  );
};

interface MusicDashboardProps {
  onAddAlbumClick?: () => void;
  onEditAlbum?: (album: Album) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const MusicDashboard: React.FC<MusicDashboardProps> = ({ onAddAlbumClick, onEditAlbum }) => {
  const { user, nickname } = useAuth();
  const { OWNER_EMAIL } = useTheme();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const isOwner = user?.email === OWNER_EMAIL;
  const displayName = nickname ?? (user?.email ? user.email.split('@')[0] : 'Music');

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

  const handleRestoreFromSeed = async () => {
    if (!user?.id || !isOwner) return;
    if (!window.confirm('Re-insert the albums missing from your collection using the canonical dataset? Existing albums are untouched.')) return;
    try {
      const { restored } = await restoreUserAlbumsFromSeed(user.id);
      setRestoreMsg(
        restored > 0
          ? `Restored ${restored} missing album(s) from the canonical dataset.`
          : 'Collection already matches the canonical dataset.'
      );
      loadAlbums();
    } catch (err) {
      console.error('Restore failed', err);
      setRestoreMsg('Restore failed — check the console.');
    }
  };

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
          className="w-10 h-10 border-2 border-white/20 border-t-[color:var(--accent-primary)] rounded-full mb-4"
        />
        <p className="text-white/40 text-sm font-medium">Loading collection…</p>
      </div>
    );
  }

  // ── Empty State for Authenticated Users with 0 Albums ──
  if (user && albums.length === 0) {
    return (
      <div className="glass-panel p-8 sm:p-14 rounded-3xl neon-border text-center flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-20 h-20 rounded-3xl bg-[color:var(--accent-primary)]/15 border border-[color:var(--accent-primary)]/30 flex items-center justify-center mb-6">
          <Disc3 className="w-10 h-10 text-[color:var(--accent-primary)] animate-pulse" />
        </div>
        <h3 className="text-3xl font-black mb-3">Your Collection is Empty</h3>
        <p className="text-white/50 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
          Logged in as <span className="text-white font-semibold">{user.email}</span>. Start building your own rated album collection!
        </p>
        <div className="flex gap-4">
          <button
            onClick={onAddAlbumClick ?? (() => navigate('/intake'))}
            className="btn-primary px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Album
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
          <div className="px-6 py-3 rounded-full bg-[color:var(--accent-primary)] text-white font-bold text-lg shadow-2xl animate-ping-once">
            🔓 Access Granted
          </div>
        </div>
      )}

      {/* Section header: Renamed to "Username's List", import/clear buttons removed */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Music
              className="text-[color:var(--accent-primary)] cursor-pointer select-none"
              onClick={handleSecretTap}
              onTouchEnd={(e) => { e.preventDefault(); handleSecretTap(); }}
              role="button"
              tabIndex={0}
              aria-label="Admin Settings"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSecretTap(); }}
            />
            {user ? `${displayName}'s List` : "Dylan's List"}
          </h3>
          <p className="text-white/40 text-sm mt-1">
            {albums.length} albums rated {user ? `· ${displayName}'s collection` : '· powered by personal data'}
          </p>
        </div>

        {/* Owner recovery + theme controls */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => void handleRestoreFromSeed()}
              title="Re-insert the albums missing from your collection using the canonical dataset (owner only)"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-[color:var(--accent-primary)]" />
              Restore Albums
            </button>
          )}
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            title="Customize UI Color Theme"
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-all"
          >
            <Palette className="w-4 h-4 text-[color:var(--accent-primary)]" />
            Color Theme
          </button>
        </div>
        {restoreMsg && (
          <p className="text-xs text-white/50 mt-2">{restoreMsg}</p>
        )}
      </div>

      {/* Theme Picker Drawer */}
      <AnimatePresence>
        {showThemePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-black/40">
              <ThemePicker mode="site" label={isOwner ? "Site-Wide Theme (Owner)" : "Personal Theme Experience"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-segment grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── BIG: Interactive Album List ── */}
        <div className="lg:col-span-7 flex flex-col h-[950px]">
          <AlbumList
            albums={baseSortedAlbums}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEditAlbum={onEditAlbum}
            onUpdateAlbums={loadAlbums}
          />
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-5 flex flex-col gap-5 h-full">

          {/* Small section 1: Top Genres */}
          <div className="glass-panel rounded-3xl border border-white/10 p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[color:var(--accent-primary)]" />
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
          {stats.highestRated && (
            <div className="glass-panel rounded-3xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-[color:var(--accent-primary)]" />
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
                {stats.oldest && (
                  <StatCard
                    icon={<Calendar className="w-4 h-4" />}
                    label="Oldest Album"
                    value={String(stats.oldest.Album)}
                    sub={`${stats.oldest.Artist} · ${stats.oldest['Release Year']}`}
                  />
                )}
                {stats.newest && (
                  <StatCard
                    icon={<Calendar className="w-4 h-4" />}
                    label="Newest Album"
                    value={String(stats.newest.Album)}
                    sub={`${stats.newest.Artist} · ${stats.newest['Release Year']}`}
                  />
                )}
                {stats.shortest && (
                  <StatCard
                    icon={<Clock className="w-4 h-4" />}
                    label="Shortest Album"
                    value={String(stats.shortest.Album)}
                    sub={`${stats.shortest.Artist} · ${formatSeconds(parseLengthToSeconds(stats.shortest.Length))}`}
                  />
                )}
                {stats.longest && (
                  <StatCard
                    icon={<Clock className="w-4 h-4" />}
                    label="Longest Album"
                    value={String(stats.longest.Album)}
                    sub={`${stats.longest.Artist} · ${formatSeconds(parseLengthToSeconds(stats.longest.Length))}`}
                  />
                )}
                {stats.topArtist && (
                  <StatCard
                    icon={<Disc3 className="w-4 h-4" />}
                    label="Most Listened"
                    value={stats.topArtist[0]}
                    sub={`${stats.topArtist[1]} albums rated`}
                  />
                )}
                {stats.lowestRated && (
                  <StatCard
                    icon={<Music className="w-4 h-4" />}
                    label="Lowest Rated"
                    value={String(stats.lowestRated.Album)}
                    sub={`${stats.lowestRated.Artist} · ${stats.lowestRated.Rating}/10`}
                  />
                )}
              </div>
            </div>
          )}
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
