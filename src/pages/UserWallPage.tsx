import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Calendar, Music, Search,
  X, ArrowLeft, AlignLeft, Trophy, Palette, Loader2,
} from 'lucide-react';
import { getUserAlbumsForProfile, getUserProfile } from '../lib/profileStore';
import type { AlbumEntry } from '../types/album';
import type { UserProfile } from '../lib/profileStore';
import ViewingPlatformButtons from '../components/ViewingPlatformButtons';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 120) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,30%), hsl(${h2},80%,20%))`;
}

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

/** Extract dominant hue (0-360) from a cover image via hidden canvas. */
async function extractDominantHue(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const SIZE = 32;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(0); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum > 20 && lum < 235) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }
        if (count === 0) { resolve(0); return; }
        r /= count; g /= count; b /= count;
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        const d = max - min;
        let h = 0;
        if (d !== 0) {
          if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
          else if (max === gn) h = ((bn - rn) / d + 2) / 6;
          else h = ((rn - gn) / d + 4) / 6;
        }
        resolve(Math.round(h * 360));
      } catch { resolve(0); }
    };
    img.onerror = () => resolve(0);
    img.src = src;
  });
}

function ratingColor(r: number): string {
  if (r >= 9) return 'var(--accent-primary)';
  if (r >= 7.5) return '#06b6d4';
  if (r >= 6) return '#3b82f6';
  if (r >= 4) return '#f59e0b';
  return '#ef4444';
}

// ─── Sort options ─────────────────────────────────────────────────────────────
type SortMode = 'rating_desc' | 'rating_asc' | 'year_desc' | 'year_asc' | 'alpha' | 'color';

const SORT_OPTIONS: { key: SortMode; label: string; icon: React.ReactNode }[] = [
  { key: 'rating_desc', label: 'Best First', icon: <Star className="w-3.5 h-3.5" /> },
  { key: 'rating_asc', label: 'Worst First', icon: <Star className="w-3.5 h-3.5 opacity-40" /> },
  { key: 'year_desc', label: 'Newest', icon: <Calendar className="w-3.5 h-3.5" /> },
  { key: 'year_asc', label: 'Oldest', icon: <Calendar className="w-3.5 h-3.5 opacity-40" /> },
  { key: 'alpha', label: 'A → Z', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { key: 'color', label: 'By Color', icon: <Palette className="w-3.5 h-3.5" /> },
];

function sortedAlbums(albums: AlbumEntry[], mode: SortMode, hues?: Map<string, number>): AlbumEntry[] {
  const arr = [...albums];
  const albumKeyOf = (a: AlbumEntry) => `${String(a.Album)}-${a.Artist}`;
  switch (mode) {
    case 'rating_desc': return arr.sort((a, b) => b.Rating - a.Rating);
    case 'rating_asc': return arr.sort((a, b) => a.Rating - b.Rating);
    case 'year_desc': return arr.sort((a, b) => b['Release Year'] - a['Release Year']);
    case 'year_asc': return arr.sort((a, b) => a['Release Year'] - b['Release Year']);
    case 'alpha': return arr.sort((a, b) => String(a.Album).localeCompare(String(b.Album)));
    case 'color': return arr.sort((a, b) => (hues?.get(albumKeyOf(a)) ?? 999) - (hues?.get(albumKeyOf(b)) ?? 999));
    default: return arr;
  }
}

// ─── Album Wall Tile ──────────────────────────────────────────────────────────
function WallTile({ album, rank, onClick }: { album: AlbumEntry; rank: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
  const color = ratingColor(album.Rating);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.22 }}
      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
      style={{
        boxShadow: hovered ? `0 0 0 2px ${color}, 0 12px 36px rgba(0,0,0,0.7)` : '0 2px 8px rgba(0,0,0,0.5)',
        transform: hovered ? 'scale(1.07) translateZ(0)' : 'scale(1) translateZ(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        zIndex: hovered ? 10 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {hasCover ? (
        <img
          src={album.CoverArt}
          alt={`${String(album.Album)} by ${album.Artist}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: generateGradient(String(album.Album) + album.Artist) }}
        >
          <Music className="w-6 h-6 text-white/20" />
        </div>
      )}

      {/* Rank badge */}
      {rank > 0 && (
        <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-sm rounded px-1 py-0.5 z-10">
          <span className="text-[8px] font-black text-white leading-none">#{rank}</span>
        </div>
      )}

      {/* Rating badge */}
      <div
        className="absolute top-1 right-1 rounded px-1 py-0.5 z-10 text-[8px] font-black leading-none"
        style={{ background: `${color}cc`, color: '#fff', backdropFilter: 'blur(4px)' }}
      >
        {album.Rating.toFixed(1)}
      </div>

      {/* Hover overlay */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 flex flex-col justify-end z-20"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.93) 50%, transparent 100%)' }}
          >
            <div className="p-2">
              <p className="text-white text-[11px] font-bold leading-tight truncate">{String(album.Album)}</p>
              <p className="text-white/55 text-[10px] truncate mt-0.5">{album.Artist}</p>
              <p className="text-white/35 text-[9px] mt-0.5">{album['Release Year']}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Album Detail Modal ───────────────────────────────────────────────────────
function WallDetailModal({
  album, albums, index, onClose, onPrev, onNext,
}: {
  album: AlbumEntry;
  albums: AlbumEntry[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
  const secs = parseLengthToSeconds(album.Length ?? '');
  const color = ratingColor(album.Rating);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-lg"
      />

      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className="relative z-10 w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-white/10"
        style={{ background: 'linear-gradient(180deg, #16161a 0%, #111113 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Blurred hero */}
        <div className="relative h-56 overflow-hidden rounded-t-[2rem] flex-shrink-0">
          {hasCover && (
            <img
              src={album.CoverArt}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-35"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: hasCover
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, #111113 90%)'
                : generateGradient(String(album.Album) + album.Artist),
            }}
          />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cover + title row */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 px-5 pb-5 z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/15">
              {hasCover ? (
                <img src={album.CoverArt} alt={String(album.Album)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: generateGradient(String(album.Album) + album.Artist) }}>
                  <Music className="w-8 h-8 text-white/25" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight line-clamp-2">{String(album.Album)}</h2>
              <p className="text-sm font-bold mt-1 truncate" style={{ color: 'var(--accent-primary)' }}>{album.Artist}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-8 pt-4">
          <div className="flex flex-wrap gap-2 mb-5">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border"
              style={{ background: `${color}1a`, borderColor: `${color}40`, color }}
            >
              <Star className="w-3 h-3 fill-current" /> {album.Rating.toFixed(1)} / 10
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
              <Calendar className="w-3 h-3" /> {album['Release Year']}
            </span>
            {secs > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
                <Music className="w-3 h-3" /> {formatSeconds(secs)}
              </span>
            )}
            {album.Genre && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/50 max-w-[180px] truncate">
                {album.Genre.split(',')[0].trim()}
              </span>
            )}
            </div>

          <ViewingPlatformButtons
            albumName={String(album.Album)}
            artistName={album.Artist}
            appleMusicLink={album.AppleMusicLink}
          />

          <div className="h-px bg-white/[0.06] mb-6" />

          {/* Prev / Next */}
          <div className="flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={index <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ← Prev
            </button>
            <span className="text-xs text-white/35 font-mono">{index + 1} / {albums.length}</span>
            <button
              onClick={onNext}
              disabled={index >= albums.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserWallPage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('rating_desc');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hues, setHues] = useState<Map<string, number>>(new Map());
  const [colorExtracting, setColorExtracting] = useState(false);
  const extractionStarted = useRef(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSelectedIdx(null);
      setProfile(null);
      setAlbums([]);
      if (!userId) {
        setLoading(false);
        return;
      }
      const [prof, cols] = await Promise.all([
        getUserProfile(userId),
        getUserAlbumsForProfile(userId, false),
      ]);
      setProfile(prof);
      setAlbums(cols);
      setLoading(false);
    }
    load();
  }, [userId]);

  // Lazily extract cover hues the first time "By Color" sorting is used
  useEffect(() => {
    if (sortMode !== 'color' || extractionStarted.current || albums.length === 0) return;
    extractionStarted.current = true;
    setColorExtracting(true);
    const withCovers = albums.filter((a) => a.CoverArt && a.CoverArt !== 'Not Found');
    const newMap = new Map<string, number>();
    let remaining = withCovers.length;
    if (remaining === 0) { setColorExtracting(false); return; }
    withCovers.forEach(async (a) => {
      const key = `${String(a.Album)}-${a.Artist}`;
      const hue = await extractDominantHue(a.CoverArt!);
      newMap.set(key, hue);
      remaining -= 1;
      if (remaining === 0) {
        setHues(new Map(newMap));
        setColorExtracting(false);
      }
    });
  }, [sortMode, albums]);

  const displayName = profile?.nickname ?? 'This user';
  const avgRating = albums.length
    ? Math.round((albums.reduce((s, a) => s + a.Rating, 0) / albums.length) * 10) / 10
    : 0;

  const byRating = useMemo(() => [...albums].sort((a, b) => b.Rating - a.Rating), [albums]);
  const sorted = useMemo(() => sortedAlbums(albums, sortMode, hues), [albums, sortMode, hues]);
  const selectedAlbum = selectedIdx !== null ? sorted[selectedIdx] ?? null : null;

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
    <div className="container mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Other Users
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-4">
            <Trophy className="w-3.5 h-3.5 text-[color:var(--accent-primary)]" />
            <span className="text-xs text-white/60 font-bold uppercase tracking-wider">Album Wall</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-black mb-3">
            {displayName}
            <span className="gradient-text">'s Wall</span>
          </h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
            {albums.length} albums rated
            {albums.length > 0 ? ` · ${avgRating.toFixed(1)} average rating` : ''} by @{displayName}.
          </p>
        </div>
      </div>

      {/* Sort pills */}
      <div className="flex flex-wrap gap-2 items-center justify-center mb-6">
        {SORT_OPTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setSortMode(key); setSelectedIdx(null); }}
            disabled={key === 'color' && colorExtracting}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
              sortMode === key
                ? 'bg-[color:var(--accent-primary)] text-white border-[color:var(--accent-primary)]'
                : 'bg-white/[0.04] border-white/10 text-white/55 hover:text-white hover:border-white/20 hover:bg-white/[0.07]'
            } disabled:opacity-40 disabled:cursor-wait`}
          >
            {key === 'color' && colorExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
            {label}
          </button>
        ))}

        {/* Rainbow legend when color sort active */}
        {sortMode === 'color' && !colorExtracting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 ml-1"
          >
            <div
              className="h-3.5 w-20 rounded-full"
              style={{ background: 'linear-gradient(to right, #ef4444, #f5a623, #84cc16, #22d3ee, #6366f1, #d946ef, #ef4444)' }}
            />
            <span className="text-[10px] text-white/30 font-mono">0° → 360°</span>
          </motion.div>
        )}
      </div>

      {/* Wall Grid */}
      {sorted.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-white/10 py-20 text-center">
          <Search className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/35 text-sm">This user hasn't added any albums yet.</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}
        >
          <AnimatePresence mode="popLayout">
            {sorted.map((album, idx) => (
              <WallTile
                key={`${String(album.Album)}-${album.Artist}`}
                album={album}
                rank={
                  sortMode === 'rating_desc'
                    ? byRating.findIndex(
                        (a) => String(a.Album) === String(album.Album) && a.Artist === album.Artist
                      ) + 1
                    : 0
                }
                onClick={() => setSelectedIdx(idx)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedAlbum && (
          <WallDetailModal
            album={selectedAlbum}
            albums={sorted}
            index={selectedIdx ?? 0}
            onClose={() => setSelectedIdx(null)}
            onPrev={() => setSelectedIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
            onNext={() => setSelectedIdx((i) => (i !== null && i < sorted.length - 1 ? i + 1 : i))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}