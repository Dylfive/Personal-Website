import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Users, ArrowUpDown, Star, Hash, TrendingUp, TrendingDown,
  Medal, Music, Loader2, RefreshCw,
} from 'lucide-react';
import { getLeaderboardData } from '../lib/profileStore';
import type { LeaderboardEntry } from '../lib/profileStore';
import UserProfileModal from '../components/UserProfileModal';
import { useAuth } from '../contexts/AuthContext';

type SortKey = 'albumCount' | 'avgRatingDesc' | 'avgRatingAsc' | 'bestAlbum' | 'newest' | 'oldest';

interface SortOption {
  key: SortKey;
  label: string;
  icon: React.ReactNode;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'albumCount',    label: 'Most Albums',       icon: <Hash className="w-3.5 h-3.5" /> },
  { key: 'avgRatingDesc', label: 'Highest Avg',        icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'avgRatingAsc',  label: 'Lowest Avg',         icon: <TrendingDown className="w-3.5 h-3.5" /> },
  { key: 'bestAlbum',     label: 'Best Top Album',     icon: <Star className="w-3.5 h-3.5" /> },
  { key: 'newest',        label: 'Newest Member',      icon: <Trophy className="w-3.5 h-3.5" /> },
  { key: 'oldest',        label: 'OG Member',          icon: <Medal className="w-3.5 h-3.5" /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

function rankBadge(rank: number) {
  if (rank === 1) return { emoji: '🥇', color: '#f5a623' };
  if (rank === 2) return { emoji: '🥈', color: '#94a3b8' };
  if (rank === 3) return { emoji: '🥉', color: '#cd7c2f' };
  return { emoji: `#${rank}`, color: '#ffffff33' };
}

// ─── Row Component ────────────────────────────────────────────────────────────
function LeaderboardRow({
  entry,
  rank,
  sortKey,
  isCurrentUser,
  onClick,
}: {
  entry: LeaderboardEntry;
  rank: number;
  sortKey: SortKey;
  isCurrentUser: boolean;
  onClick: () => void;
}) {
  const color = avatarColor(entry.nickname);
  const badge = rankBadge(rank);
  const hasCover =
    entry.topAlbumCover && entry.topAlbumCover !== 'Not Found';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
        isCurrentUser
          ? 'border-accent-amber/30 bg-accent-amber/[0.06] hover:bg-accent-amber/[0.10]'
          : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12]'
      }`}
    >
      {/* Rank */}
      <div className="w-10 text-center flex-shrink-0">
        {rank <= 3 ? (
          <span className="text-xl leading-none">{badge.emoji}</span>
        ) : (
          <span
            className="text-sm font-black font-mono"
            style={{ color: badge.color }}
          >
            #{rank}
          </span>
        )}
      </div>

      {/* Top album thumbnail (tiny) */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
        {hasCover ? (
          <img
            src={entry.topAlbumCover}
            alt="Top album"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Music className="w-4 h-4 text-white/20" />
          </div>
        )}
      </div>

      {/* Avatar + Nickname */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 border"
          style={{
            background: `${color}20`,
            borderColor: `${color}40`,
            color,
          }}
        >
          {entry.nickname[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
            {entry.nickname}
            {isCurrentUser && (
              <span className="text-[9px] font-black uppercase tracking-widest text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 rounded-full border border-accent-amber/20">
                You
              </span>
            )}
          </p>
          {entry.topAlbum && (
            <p className="text-[11px] text-white/35 truncate">
              Top: {String(entry.topAlbum.Album)}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
            Albums
          </p>
          <p className="text-sm font-bold text-white">{entry.albumCount}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
            Avg
          </p>
          <p
            className="text-sm font-black"
            style={{ color: entry.avgRating >= 7 ? '#f5a623' : '#94a3b8' }}
          >
            {entry.albumCount > 0 ? entry.avgRating.toFixed(1) : '—'}
          </p>
        </div>
        {/* Best album rating pill (highlight when sorted by bestAlbum) */}
        {sortKey === 'bestAlbum' && entry.topAlbum && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
              Best
            </p>
            <p className="text-sm font-black text-accent-amber">
              {entry.topAlbum.Rating.toFixed(1)}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user, nickname: myNickname } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('albumCount');
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getLeaderboardData();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...entries];
    switch (sortKey) {
      case 'albumCount':
        return copy.sort((a, b) => b.albumCount - a.albumCount);
      case 'avgRatingDesc':
        return copy.sort((a, b) => b.avgRating - a.avgRating);
      case 'avgRatingAsc':
        return copy.sort((a, b) => a.avgRating - b.avgRating);
      case 'bestAlbum':
        return copy.sort(
          (a, b) => (b.topAlbum?.Rating ?? 0) - (a.topAlbum?.Rating ?? 0)
        );
      case 'newest':
        return copy.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return copy.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      default:
        return copy;
    }
  }, [entries, sortKey]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-10 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-accent-amber/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-accent-slate/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 mb-4">
            <Users className="w-3.5 h-3.5 text-accent-amber" />
            <span className="text-xs text-accent-amber/80 font-bold uppercase tracking-wider">
              Leaderboard
            </span>
          </div>
          <h1 className="text-4xl font-serif font-black mb-3">
            Other <span className="gradient-text">Walls</span>
          </h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto">
            See how your music taste stacks up. Click any user to peek at their wall.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {SORT_OPTIONS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 ${
                sortKey === key
                  ? 'bg-accent-amber text-black border-accent-amber shadow-[0_0_16px_rgba(245,166,35,0.35)]'
                  : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* List */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          {/* Column header */}
          <div className="flex items-center gap-4 px-4 py-3 bg-black/20 border-b border-white/[0.06]">
            <ArrowUpDown className="w-3.5 h-3.5 text-white/25 ml-10" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-bold flex-1">
              User
            </p>
            <div className="flex items-center gap-4 flex-shrink-0 pr-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-bold hidden sm:block">
                Albums
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-bold">
                Avg
              </p>
              {sortKey === 'bestAlbum' && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-bold">
                  Best
                </p>
              )}
            </div>
          </div>

          <div className="p-4 flex flex-col gap-2 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-accent-amber animate-spin" />
                <p className="text-white/40 text-sm">Loading leaderboard…</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/30">
                <Users className="w-10 h-10 opacity-40" />
                <p className="text-sm">No users on the board yet.</p>
                <p className="text-xs">Be the first to set a nickname!</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sorted.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    rank={i + 1}
                    sortKey={sortKey}
                    isCurrentUser={entry.userId === user?.id}
                    onClick={() => setSelectedUser(entry)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {!loading && sorted.length > 0 && (
            <div className="px-4 py-3 border-t border-white/[0.06] bg-black/10 text-center">
              <p className="text-[11px] text-white/25">
                {sorted.length} user{sorted.length !== 1 ? 's' : ''} on the board
                {myNickname && ` · You are @${myNickname}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          userId={selectedUser.userId}
          nickname={selectedUser.nickname}
          createdAt={selectedUser.createdAt}
          albumCount={selectedUser.albumCount}
          avgRating={selectedUser.avgRating}
          visibleStats={selectedUser.visibleStats}
          onClose={() => setSelectedUser(null)}
          onStatsUpdated={load}
        />
      )}
    </div>
  );
}
