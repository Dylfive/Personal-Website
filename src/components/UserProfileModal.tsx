import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Music, Star, Trophy, Calendar, Disc3, TrendingUp, Hash,
} from 'lucide-react';
import { getUserAlbumsForProfile } from '../lib/profileStore';
import type { AlbumEntry } from '../types/album';

interface UserProfileModalProps {
  userId: string;
  nickname: string;
  createdAt: string;
  albumCount: number;
  avgRating: number;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 130) % 360;
  return `linear-gradient(135deg, hsl(${h1},65%,28%), hsl(${h2},75%,18%))`;
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

function memberSince(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function topGenre(albums: AlbumEntry[]): string {
  const map: Record<string, number> = {};
  albums.forEach((a) => {
    const g = a.Genre.split(',')[0].trim();
    map[g] = (map[g] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

function avgDecade(albums: AlbumEntry[]): string {
  if (!albums.length) return '—';
  const avg =
    albums.reduce((s, a) => s + Number(a['Release Year']), 0) / albums.length;
  return `${Math.round(avg / 10) * 10}s`;
}

// ─── Album Cover (mini) ───────────────────────────────────────────────────────
function MiniCover({ album, rank }: { album: AlbumEntry; rank: number }) {
  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
  const rankColors = ['#f5a623', '#94a3b8', '#cd7c2f'];
  const rankLabels = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-colors">
      {/* Cover */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
        {hasCover ? (
          <img
            src={album.CoverArt}
            alt={String(album.Album)}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: generateGradient(String(album.Album) + album.Artist) }}
          >
            <Music className="w-5 h-5 text-white/30" />
          </div>
        )}
        {/* Rank badge */}
        <div
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black"
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          {rankLabels[rank]}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{String(album.Album)}</p>
        <p className="text-xs text-white/50 truncate">{album.Artist}</p>
      </div>

      {/* Rating */}
      <div
        className="flex-shrink-0 text-sm font-black px-2 py-1 rounded-lg"
        style={{ background: `${rankColors[rank]}22`, color: rankColors[rank] }}
      >
        {album.Rating.toFixed(1)}
      </div>
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-center">
      <div className="flex justify-center text-accent-amber">{icon}</div>
      <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold">{label}</p>
      <p className="text-sm font-bold text-white leading-tight">{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserProfileModal({
  userId,
  nickname,
  createdAt,
  albumCount,
  avgRating,
  onClose,
}: UserProfileModalProps) {
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserAlbumsForProfile(userId).then((data) => {
      if (!cancelled) {
        setAlbums(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  const top3 = albums.slice(0, 3);
  const highest = albums[0] ?? null;
  const color = avatarColor(nickname);

  return (
    <AnimatePresence>
      <motion.div
        key="profile-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        style={{ background: 'rgba(13,13,15,0.80)', backdropFilter: 'blur(10px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel rounded-3xl w-full max-w-md overflow-hidden border border-white/10 relative"
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Amber top line */}
          <div className="amber-shimmer-top" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="p-6 pb-4 flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0 border-2"
              style={{ background: `${color}22`, borderColor: `${color}55`, color }}
            >
              {nickname[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-serif font-bold text-white truncate">
                {nickname}
              </h2>
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Member since {memberSince(createdAt)}
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-2">
              <StatPill
                icon={<Hash className="w-3.5 h-3.5" />}
                label="Albums"
                value={String(albumCount)}
              />
              <StatPill
                icon={<Star className="w-3.5 h-3.5" />}
                label="Avg Rating"
                value={albumCount > 0 ? `${avgRating.toFixed(1)}` : '—'}
              />
              <StatPill
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Top Era"
                value={avgDecade(albums)}
              />
            </div>

            {/* Top 3 Albums */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-accent-amber" />
                Top 3 Albums
              </h3>
              {loading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-white/[0.04] animate-pulse border border-white/[0.04]"
                    />
                  ))}
                </div>
              ) : top3.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {top3.map((album, i) => (
                    <MiniCover key={i} album={album} rank={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-white/30 text-sm">
                  No albums yet
                </div>
              )}
            </div>

            {/* Fun Stats */}
            {!loading && albums.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
                  <Disc3 className="w-3.5 h-3.5 text-accent-amber" />
                  Fun Stats
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-1">
                      Highest Rated
                    </p>
                    <p className="text-white font-semibold truncate">{String(highest?.Album)}</p>
                    <p className="text-white/40 text-xs truncate">{highest?.Artist}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-1">
                      Favorite Genre
                    </p>
                    <p className="text-white font-semibold truncate">{topGenre(albums)}</p>
                    <p className="text-white/40 text-xs">by album count</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
