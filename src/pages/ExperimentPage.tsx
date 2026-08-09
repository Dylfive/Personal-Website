import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Star, Calendar, Clock, Music, ExternalLink,
  Disc3, Sparkles, Loader2, ChevronLeft, ChevronRight,
  FlaskConical, Palette, AlignLeft, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserAlbums } from '../lib/albumStore';
import { getAlbumRecommendations } from '../lib/aiEnrichment';
import type { AlbumEntry } from '../types/album';
import type { AlbumRecommendation } from '../lib/aiEnrichment';

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

// ─── Sort options ──────────────────────────────────────────────────────────────

type SortMode = 'rating_desc' | 'rating_asc' | 'recent' | 'year_desc' | 'year_asc' | 'alpha' | 'color';

interface SortOption { key: SortMode; label: string; icon: React.ReactNode }

const SORT_OPTIONS: SortOption[] = [
  { key: 'rating_desc', label: 'Best First',     icon: <Star className="w-3.5 h-3.5" /> },
  { key: 'rating_asc',  label: 'Worst First',    icon: <Star className="w-3.5 h-3.5 opacity-40" /> },
  { key: 'recent',      label: 'Recently Added', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'year_desc',   label: 'Newest Release', icon: <Calendar className="w-3.5 h-3.5" /> },
  { key: 'year_asc',    label: 'Oldest Release', icon: <Calendar className="w-3.5 h-3.5 opacity-40" /> },
  { key: 'alpha',       label: 'A → Z',          icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { key: 'color',       label: 'By Color',       icon: <Palette className="w-3.5 h-3.5" /> },
];

function ratingColor(r: number): string {
  if (r >= 9)   return '#f5a623';
  if (r >= 7.5) return '#06b6d4';
  if (r >= 6)   return '#3b82f6';
  if (r >= 4)   return '#f59e0b';
  return '#ef4444';
}

// ─── Album Tile ───────────────────────────────────────────────────────────────
type DisplayAlbum = AlbumEntry & { _globalRank: number };

function AlbumTile({
  album,
  onClick,
  showRank,
}: {
  album: DisplayAlbum;
  onClick: () => void;
  showRank: boolean;
}) {
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
        boxShadow: hovered
          ? `0 0 0 2px ${color}, 0 12px 36px rgba(0,0,0,0.7)`
          : '0 2px 8px rgba(0,0,0,0.5)',
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
      {showRank && album._globalRank > 0 && (
        <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-sm rounded px-1 py-0.5 z-10">
          <span className="text-[8px] font-black text-white leading-none">#{album._globalRank}</span>
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

// ─── AI Recommendations Panel ─────────────────────────────────────────────────
function RecommendationsPanel({ album, allAlbums }: { album: AlbumEntry; allAlbums: AlbumEntry[] }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [recs, setRecs] = useState<AlbumRecommendation[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when album changes
  useEffect(() => {
    setState('idle');
    setRecs([]);
    setErrorMsg('');
  }, [album]);

  const generate = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const results = await getAlbumRecommendations(album, allAlbums);
      setRecs(results);
      setState('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_API_KEY') {
        setErrorMsg('No Gemini API key found. Add your key via Admin Settings in the intake page.');
      } else {
        setErrorMsg('Failed to get recommendations. Check your API key and try again.');
      }
      setState('error');
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent-amber" />
        <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-white/80">AI Recommendations</h4>
      </div>

      {state === 'idle' && (
        <div
          className="rounded-2xl border border-dashed border-accent-amber/20 bg-accent-amber/[0.03] p-5 text-center"
        >
          <Sparkles className="w-6 h-6 text-accent-amber/50 mx-auto mb-2" />
          <p className="text-white/45 text-sm mb-4 leading-relaxed">
            Find albums similar to{' '}
            <span className="text-white/80 font-semibold">{String(album.Album)}</span>{' '}
            using AI.
          </p>
          <button
            id="generate-recommendations-btn"
            onClick={generate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', color: '#fff', boxShadow: '0 0 20px var(--accent-glow)' }}
          >
            <Sparkles className="w-4 h-4" />
            Generate Recommendations
          </button>
        </div>
      )}

      {state === 'loading' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-accent-amber animate-spin" />
          <p className="text-white/40 text-sm">Asking Gemini…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
          <p className="text-red-400 text-sm mb-3 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => setState('idle')}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {state === 'done' && recs.length > 0 && (
        <div className="space-y-2">
          {recs.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.25 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:border-accent-amber/25 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-primary)', border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)' }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold truncate">{rec.title}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--accent-primary)' }}>{rec.artist}</p>
                  <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{rec.reason}</p>
                </div>
              </div>
            </motion.div>
          ))}
          <button
            onClick={generate}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-white/35 hover:text-white hover:border-white/20 hover:bg-white/[0.03] text-xs transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Album Detail Modal ────────────────────────────────────────────────────────
function AlbumDetailModal({
  album,
  allAlbums,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  album: DisplayAlbum;
  allAlbums: AlbumEntry[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
  const sameArtist = allAlbums.filter(
    (a) => a.Artist === album.Artist && String(a.Album) !== String(album.Album)
  );
  const secs = parseLengthToSeconds(album.Length ?? '');
  const color = ratingColor(album.Rating);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-lg"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className="relative z-10 w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-white/10"
        style={{ background: 'linear-gradient(180deg, #16161a 0%, #111113 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Blurred hero header */}
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

          {/* Nav buttons */}
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {hasPrev && (
            <button
              id="modal-prev-btn"
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              className="absolute top-1/2 left-4 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {hasNext && (
            <button
              id="modal-next-btn"
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              className="absolute top-1/2 right-14 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

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
          {/* Stat pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border"
              style={{ background: `${color}1a`, borderColor: `${color}40`, color }}
            >
              <Star className="w-3 h-3 fill-current" /> {album.Rating.toFixed(1)} / 10
            </span>
            {album._globalRank > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/60">
                #{album._globalRank} in collection
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
              <Calendar className="w-3 h-3" /> {album['Release Year']}
            </span>
            {secs > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
                <Clock className="w-3 h-3" /> {formatSeconds(secs)}
              </span>
            )}
            {(album.TrackCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/60">
                <Disc3 className="w-3 h-3" /> {album.TrackCount} tracks
              </span>
            )}
            {album.Genre && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/50 max-w-[180px] truncate">
                {album.Genre.split(',')[0].trim()}
              </span>
            )}
          </div>

          {/* Apple Music link */}
          {album.AppleMusicLink && (
            <a
              href={album.AppleMusicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 text-white/65 hover:text-white hover:border-accent-amber/40 hover:bg-accent-amber/8 transition-all text-sm font-semibold mb-6"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Listen on Apple Music
            </a>
          )}

          {/* More by same artist */}
          {sameArtist.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Disc3 className="w-4 h-4 text-accent-amber" />
                <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-white/75">
                  More by {album.Artist}
                </h4>
                <span className="text-xs text-white/30 font-mono">({sameArtist.length})</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {sameArtist.sort((a, b) => b.Rating - a.Rating).map((a) => {
                  const hasCoverA = a.CoverArt && a.CoverArt !== 'Not Found';
                  return (
                    <div key={String(a.Album)} className="flex-shrink-0 w-16 text-center group/other">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 group-hover/other:border-accent-amber/35 transition-colors shadow-md">
                        {hasCoverA ? (
                          <img
                            src={a.CoverArt}
                            alt={String(a.Album)}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: generateGradient(String(a.Album) + a.Artist) }}>
                            <Music className="w-4 h-4 text-white/20" />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-white/45 mt-1 leading-tight line-clamp-2">{String(a.Album)}</p>
                      <p
                        className="text-[9px] font-black mt-0.5"
                        style={{ color: ratingColor(a.Rating) }}
                      >
                        {a.Rating.toFixed(1)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-6" />

          {/* AI Recommendations */}
          <RecommendationsPanel album={album} allAlbums={allAlbums} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExperimentPage() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('rating_desc');
  const [search, setSearch] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hues, setHues] = useState<Map<string, number>>(new Map());
  const [colorExtracting, setColorExtracting] = useState(false);
  const extractionStarted = useRef(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getUserAlbums(user?.id);
      setAlbums(data.filter((a) => !a.IsHidden));
      setLoading(false);
    }
    load();
  }, [user?.id]);

  // Trigger color extraction when color sort is first selected
  useEffect(() => {
    if (sortMode !== 'color' || extractionStarted.current || albums.length === 0) return;
    extractionStarted.current = true;
    setColorExtracting(true);
    const withCovers = albums.filter((a) => a.CoverArt && a.CoverArt !== 'Not Found');
    const newMap = new Map<string, number>();
    let remaining = withCovers.length;
    if (remaining === 0) { setColorExtracting(false); return; }
    withCovers.forEach(async (a) => {
      const key = String(a.Album) + a.Artist;
      const hue = await extractDominantHue(a.CoverArt!);
      newMap.set(key, hue);
      remaining--;
      if (remaining === 0) {
        setHues(new Map(newMap));
        setColorExtracting(false);
      }
    });
  }, [sortMode, albums]);

  const albumKey = useCallback((a: AlbumEntry) => String(a.Album) + a.Artist, []);

  const byRating = useMemo(() => [...albums].sort((a, b) => b.Rating - a.Rating), [albums]);

  const displayAlbums: DisplayAlbum[] = useMemo(() => {
    const q = search.toLowerCase();
    let result = albums.filter((a) =>
      !q ||
      String(a.Album).toLowerCase().includes(q) ||
      a.Artist.toLowerCase().includes(q) ||
      a.Genre.toLowerCase().includes(q)
    );

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case 'rating_desc': return b.Rating - a.Rating;
        case 'rating_asc':  return a.Rating - b.Rating;
        case 'year_desc':   return b['Release Year'] - a['Release Year'];
        case 'year_asc':    return a['Release Year'] - b['Release Year'];
        case 'alpha':       return String(a.Album).localeCompare(String(b.Album));
        case 'color': {
          const ha = hues.get(albumKey(a)) ?? 999;
          const hb = hues.get(albumKey(b)) ?? 999;
          return ha - hb;
        }
        case 'recent':
          return (a.RankOrder ?? 9999) - (b.RankOrder ?? 9999);
        default: return 0;
      }
    });

    return result.map((a) => ({
      ...a,
      _globalRank: byRating.findIndex((x) => String(x.Album) === String(a.Album) && x.Artist === a.Artist) + 1,
    }));
  }, [albums, search, sortMode, hues, albumKey, byRating]);

  const selectedAlbum = selectedIdx !== null ? displayAlbums[selectedIdx] ?? null : null;

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
      <div className="absolute top-0 left-1/4 w-[700px] h-[600px] bg-accent-amber/[0.03] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-cyan-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 max-w-7xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 mb-4">
            <FlaskConical className="w-3.5 h-3.5 text-accent-amber" />
            <span className="text-xs text-accent-amber/80 font-bold uppercase tracking-wider">Experiment</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-black mb-3">
            Album <span className="gradient-text">Wall</span>
          </h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
            {albums.length} albums · hover to preview · click for details & AI picks
          </p>
        </div>

        {/* Controls panel */}
        <div className="glass-panel rounded-3xl border border-white/10 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                id="experiment-search"
                type="text"
                placeholder="Search albums, artists, genres…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-9 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/50 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-white/25 text-xs font-mono flex-shrink-0 tabular-nums">
              {displayAlbums.length} / {albums.length} albums
            </p>
          </div>

          {/* Sort pills */}
          <div className="flex flex-wrap gap-2 items-center">
            {SORT_OPTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                id={`sort-${key}`}
                onClick={() => setSortMode(key)}
                disabled={key === 'color' && colorExtracting}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                  sortMode === key
                    ? 'bg-accent-amber text-black border-accent-amber shadow-[0_0_14px_rgba(245,166,35,0.4)]'
                    : 'bg-white/[0.04] border-white/10 text-white/55 hover:text-white hover:border-white/20 hover:bg-white/[0.07]'
                } disabled:opacity-40 disabled:cursor-wait`}
              >
                {key === 'color' && colorExtracting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : icon}
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
        </div>

        {/* Wall Grid */}
        {displayAlbums.length === 0 ? (
          <div className="glass-panel rounded-3xl border border-white/10 py-20 text-center">
            <Search className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/35 text-sm">No albums match your search.</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))' }}
          >
            <AnimatePresence mode="popLayout">
              {displayAlbums.map((album, idx) => (
                <AlbumTile
                  key={`${String(album.Album)}-${album.Artist}`}
                  album={album}
                  showRank={sortMode === 'rating_desc'}
                  onClick={() => setSelectedIdx(idx)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAlbum && (
          <AlbumDetailModal
            album={selectedAlbum}
            allAlbums={albums}
            onClose={() => setSelectedIdx(null)}
            onPrev={() => setSelectedIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
            onNext={() => setSelectedIdx((i) => (i !== null && i < displayAlbums.length - 1 ? i + 1 : i))}
            hasPrev={selectedIdx !== null && selectedIdx > 0}
            hasNext={selectedIdx !== null && selectedIdx < displayAlbums.length - 1}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
