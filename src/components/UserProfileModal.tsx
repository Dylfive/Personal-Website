import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, Music, Star, Trophy, Calendar, Disc3, TrendingUp, Hash, Settings, Check, LayoutGrid, MessageSquare
} from 'lucide-react';
import { getUserAlbumsForProfile, setUserVisibleStats, getUserProfile, setUserBioAndAccent, ALL_STAT_KEYS, DEFAULT_VISIBLE_STATS } from '../lib/profileStore';
import type { AlbumEntry } from '../types/album';
import { useAuth } from '../contexts/AuthContext';
import ThemePicker from './ThemePicker';

interface UserProfileModalProps {
  userId: string;
  nickname: string;
  createdAt: string;
  albumCount: number;
  avgRating: number;
  visibleStats?: string[];
  bio?: string;
  cardAccent?: string;
  onClose: () => void;
  onStatsUpdated?: () => void;
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

function topArtist(albums: AlbumEntry[]): string {
  if (!albums.length) return '—';
  const map: Record<string, number> = {};
  albums.forEach((a) => { map[a.Artist] = (map[a.Artist] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

// ─── Album Cover (mini) ───────────────────────────────────────────────────────
function MiniCover({ album, rank }: { album: AlbumEntry; rank: number }) {
  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
  const rankLabels = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-colors">
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
        {hasCover ? (
          <img
            src={album.CoverArt}
            alt={String(album.Album)}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: generateGradient(String(album.Album) + album.Artist) }}
          >
            <Music className="w-5 h-5 text-white/30" />
          </div>
        )}
        <div
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black"
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          {rankLabels[rank] ?? `#${rank + 1}`}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{String(album.Album)}</p>
        <p className="text-xs text-[color:var(--accent-primary)] truncate">{album.Artist}</p>
        <p className="text-[11px] text-white/40 mt-0.5">{album['Release Year']}</p>
      </div>

      <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex-shrink-0">
        <Star className="w-3 h-3 text-[color:var(--accent-primary)] fill-[color:var(--accent-primary)]" />
        <span className="text-xs font-bold text-white">{album.Rating.toFixed(1)}</span>
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
      <div className="flex justify-center text-[color:var(--accent-primary)]">{icon}</div>
      <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold">{label}</p>
      <p className="text-sm font-bold text-white leading-tight truncate">{value}</p>
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
  visibleStats: initialVisibleStats,
  bio: initialBio = '',
  cardAccent: initialCardAccent = '',
  onClose,
  onStatsUpdated,
}: UserProfileModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.id === userId;

  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleStats, setVisibleStats] = useState<string[]>(initialVisibleStats ?? DEFAULT_VISIBLE_STATS);
  const [bio, setBio] = useState<string>(initialBio);
  const [cardAccent, setCardAccent] = useState<string>(initialCardAccent);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserAlbumsForProfile(userId, isOwner).then((data) => {
      if (!cancelled) {
        setAlbums(data);
        setLoading(false);
      }
    });
    getUserProfile(userId).then((p) => {
      if (!cancelled && p) {
        if (p.bio) setBio(p.bio);
        if (p.cardAccent) setCardAccent(p.cardAccent);
      }
    });
    return () => { cancelled = true; };
  }, [userId, isOwner]);

  const top3 = albums.slice(0, 3);
  const highest = albums[0] ?? null;
  const lowest = [...albums].sort((a, b) => a.Rating - b.Rating)[0] ?? null;
  const color = avatarColor(nickname);

  const toggleStat = async (key: string) => {
    let updated: string[];
    if (visibleStats.includes(key)) {
      if (visibleStats.length <= 1) return;
      updated = visibleStats.filter((k) => k !== key);
    } else {
      updated = [...visibleStats, key];
    }
    setVisibleStats(updated);
    if (isOwner) {
      await setUserVisibleStats(userId, updated);
      onStatsUpdated?.();
    }
  };

  const handleSaveBio = async (newBio: string) => {
    setBio(newBio);
    if (isOwner) {
      await setUserBioAndAccent(userId, newBio, cardAccent);
      onStatsUpdated?.();
    }
  };

  const handleAccentChange = async (themeId: string) => {
    setCardAccent(themeId);
    if (isOwner) {
      await setUserBioAndAccent(userId, bio, themeId);
      onStatsUpdated?.();
    }
  };

  const isVisible = (key: string) => visibleStats.includes(key);

  const handleGoToWall = () => {
    onClose();
    navigate(`/wall/${userId}`);
  };

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
          <div className="amber-shimmer-top" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {isOwner && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Customize Profile Settings"
              className={`absolute top-4 right-14 z-10 px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all ${
                showSettings
                  ? 'bg-[color:var(--accent-primary)] text-white border-[color:var(--accent-primary)]'
                  : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Custom
            </button>
          )}

          {/* Header */}
          <div className="p-6 pb-3 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0 border-2"
              style={{ background: `${color}22`, borderColor: `${color}55`, color }}
            >
              {nickname[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-serif font-bold text-white truncate flex items-center gap-2">
                {nickname}
                {isOwner && (
                  <span className="text-[9px] font-black uppercase text-[color:var(--accent-primary)] bg-white/10 px-1.5 py-0.5 rounded-full border border-white/20">
                    You
                  </span>
                )}
              </h2>
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Member since {memberSince(createdAt)}
              </p>
              {bio && (
                <p className="text-xs text-white/70 italic mt-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 truncate">
                  "{bio}"
                </p>
              )}
            </div>
          </div>

          {/* User's Album Wall Button */}
          <div className="px-6 pb-4">
            <button
              onClick={handleGoToWall}
              className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <LayoutGrid className="w-4 h-4 text-[color:var(--accent-primary)]" />
              View {nickname}'s Album Wall
            </button>
          </div>

          {/* Settings Customization Panel */}
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-4 border-b border-white/10 bg-black/30 space-y-4"
            >
              {/* Bio / Tagline */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[color:var(--accent-primary)] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Tagline / Bio
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => handleSaveBio(e.target.value)}
                  placeholder="e.g. Progressive rock & jazz enthusiast..."
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[color:var(--accent-primary)]"
                />
              </div>

              {/* Card Accent Picker */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <ThemePicker
                  mode="personal"
                  value={cardAccent}
                  onChange={handleAccentChange}
                  label="Card Accent Color"
                />
              </div>

              {/* Stats selection */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--accent-primary)] flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Select Displayed Stats
                </h4>
                <p className="text-[11px] text-white/40">
                  Toggle which stats are visible on your profile card.
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {ALL_STAT_KEYS.map(({ key, label }) => {
                    const active = isVisible(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleStat(key)}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-white/15 border-white/30 text-white'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-[color:var(--accent-primary)] shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          <div className="px-6 pb-6 space-y-5">
            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-2">
              {isVisible('albums') && (
                <StatPill
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="Albums"
                  value={String(albumCount)}
                />
              )}
              {isVisible('avgRating') && (
                <StatPill
                  icon={<Star className="w-3.5 h-3.5" />}
                  label="Avg Rating"
                  value={albumCount > 0 ? `${avgRating.toFixed(1)}` : '—'}
                />
              )}
              {isVisible('topEra') && (
                <StatPill
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  label="Top Era"
                  value={avgDecade(albums)}
                />
              )}
              {isVisible('favoriteGenre') && !isVisible('albums') && (
                <StatPill
                  icon={<Disc3 className="w-3.5 h-3.5" />}
                  label="Top Genre"
                  value={topGenre(albums)}
                />
              )}
              {isVisible('topArtist') && (
                <StatPill
                  icon={<Music className="w-3.5 h-3.5" />}
                  label="Top Artist"
                  value={topArtist(albums)}
                />
              )}
            </div>

            {/* Top 3 Albums */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-[color:var(--accent-primary)]" />
                  Top Albums
                </span>
                <span className="text-[10px] text-white/30 font-normal">
                  Sorted by Rating & Tiebreaker
                </span>
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

            {/* Additional Displayed Stats */}
            {!loading && albums.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
                  <Disc3 className="w-3.5 h-3.5 text-[color:var(--accent-primary)]" />
                  Detailed Stats
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {isVisible('highestRated') && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                      <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-1">
                        Highest Rated
                      </p>
                      <p className="text-white font-semibold truncate">{String(highest?.Album)}</p>
                      <p className="text-white/40 text-xs truncate">{highest?.Artist} · {highest?.Rating}/10</p>
                    </div>
                  )}

                  {isVisible('favoriteGenre') && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                      <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-1">
                        Favorite Genre
                      </p>
                      <p className="text-white font-semibold truncate">{topGenre(albums)}</p>
                      <p className="text-white/40 text-xs">by album count</p>
                    </div>
                  )}

                  {isVisible('lowestRated') && lowest && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                      <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-1">
                        Lowest Rated
                      </p>
                      <p className="text-white font-semibold truncate">{String(lowest.Album)}</p>
                      <p className="text-white/40 text-xs truncate">{lowest.Artist} · {lowest.Rating}/10</p>
                    </div>
                  )}

                  {isVisible('topArtist') && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                      <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-1">
                        Most Listened Artist
                      </p>
                      <p className="text-white font-semibold truncate">{topArtist(albums)}</p>
                      <p className="text-white/40 text-xs">Top artist</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
