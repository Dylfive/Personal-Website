import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Library, LayoutGrid, Plus, Users,
  Palette, User, Pencil, Check, X,
  ChevronRight, Mail, Disc3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemePicker from '../components/ThemePicker';
import { getUserAlbums } from '../lib/albumStore';
import { validateNickname } from '../lib/profileStore';

// ─── Staggered card animation helper ─────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08 + 0.3, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, nickname, saveNickname } = useAuth();
  const { siteTheme } = useTheme();

  const [albumCount, setAlbumCount] = useState<number | null>(null);

  // Nickname editing
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickInput, setNickInput] = useState(nickname ?? '');
  const [nickError, setNickError] = useState<string | null>(null);
  const [nickSaving, setNickSaving] = useState(false);

  // Load album count on mount
  useEffect(() => {
    if (!user?.id) return;
    getUserAlbums(user.id)
      .then((albums) => setAlbumCount(albums.length))
      .catch(() => {});
  }, [user?.id]);

  // Sync nick input when nickname loads from auth context
  useEffect(() => {
    setNickInput(nickname ?? '');
  }, [nickname]);

  const avatarLetter =
    nickname?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = nickname ?? user?.email?.split('@')[0] ?? 'there';
  // user is guaranteed non-null here — this page is behind AuthGuard
  const myWallPath = `/wall/${user!.id}`;

  const handleNicknameSave = async () => {
    const valErr = validateNickname(nickInput);
    if (valErr) { setNickError(valErr); return; }
    setNickSaving(true);
    const saveErr = await saveNickname(nickInput);
    setNickSaving(false);
    if (saveErr) {
      setNickError(saveErr);
    } else {
      setEditingNickname(false);
      setNickError(null);
    }
  };

  // ── Quick-action card definitions ──────────────────────────────────────────
  const cards = [
    {
      id: 'collection',
      icon: <Library className="w-7 h-7" />,
      title: 'My Collection',
      description:
        albumCount !== null && albumCount > 0
          ? `${albumCount} album${albumCount !== 1 ? 's' : ''} rated`
          : 'Browse & manage your rated albums',
      path: '/intake',
      featured: false,
    },
    {
      id: 'wall',
      icon: <LayoutGrid className="w-7 h-7" />,
      title: 'My Wall',
      description: 'View your public album wall grid',
      path: myWallPath,
      featured: false,
    },
    {
      id: 'add',
      icon: <Plus className="w-7 h-7" />,
      title: 'Add an Album',
      description: 'Log a new album to your collection',
      path: '/add',
      featured: true,
    },
    {
      id: 'leaderboard',
      icon: <Users className="w-7 h-7" />,
      title: 'Other Walls',
      description: "Explore other users' collections",
      path: '/leaderboard',
      featured: false,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 relative overflow-hidden">

      {/* ── Background glow orbs ── */}
      <div
        className="absolute top-[-80px] left-1/3 w-[560px] h-[560px] rounded-full blur-[160px] pointer-events-none opacity-[0.18]"
        style={{ background: siteTheme.primary }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] rounded-full blur-[160px] pointer-events-none opacity-[0.12]"
        style={{ background: siteTheme.secondary }}
      />

      <div className="container mx-auto relative z-10 max-w-4xl">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-14"
        >
          {/* Avatar ring */}
          <div className="relative mb-6">
            <div
              className="w-[88px] h-[88px] rounded-[22px] flex items-center justify-center text-3xl font-black text-white shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${siteTheme.primary}, ${siteTheme.secondary})`,
                boxShadow: `0 0 40px ${siteTheme.glow}`,
              }}
            >
              {avatarLetter}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: siteTheme.secondary }}
            >
              <Disc3 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-4xl sm:text-5xl font-serif font-black mb-3 leading-tight"
          >
            Welcome back,{' '}
            <span className="gradient-text">{displayName}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-white/50 text-base max-w-sm leading-relaxed"
          >
            Your music universe at a glance.
            {albumCount !== null && albumCount > 0 && (
              <>
                {' '}
                <span className="text-white/70 font-semibold">
                  {albumCount} album{albumCount !== 1 ? 's' : ''} and counting.
                </span>
              </>
            )}
          </motion.p>
        </motion.section>

        {/* ── Quick Actions ── */}
        <section className="mb-12">
          <SectionHeading>Quick Actions</SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                id={`dashboard-card-${card.id}`}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                onClick={() => navigate(card.path)}
                className={`group relative glass-panel rounded-2xl p-6 flex items-center gap-5 text-left border transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.015] active:scale-[0.99] ${
                  card.featured
                    ? 'border-[color:var(--accent-primary)]/40 hover:border-[color:var(--accent-primary)]/70'
                    : 'border-white/10 hover:border-white/20'
                }`}
                style={
                  card.featured
                    ? { boxShadow: `0 0 32px ${siteTheme.glow}` }
                    : undefined
                }
              >
                {/* Hover wash */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 0% 50%, ${siteTheme.primary}1a, transparent 70%)`,
                  }}
                />

                {/* Icon box */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${siteTheme.primary}30, ${siteTheme.secondary}18)`,
                    color: siteTheme.primary,
                  }}
                >
                  {card.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-base leading-tight">{card.title}</p>
                  <p className="text-sm text-white/50 mt-0.5 line-clamp-2">{card.description}</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[color:var(--accent-primary)] group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Settings ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          <SectionHeading>Settings</SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

            {/* Theme Card */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <Palette className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  Colour Theme
                </h3>
              </div>
              <ThemePicker mode="site" />
            </div>

            {/* Account Card */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6 flex flex-col">
              <div className="flex items-center gap-2.5 mb-5">
                <User className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  Account
                </h3>
              </div>

              <div className="space-y-5 flex-1">
                {/* Email */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">
                    Email
                  </p>
                  <p className="text-sm text-white/60 font-mono truncate">{user?.email}</p>
                </div>

                {/* Nickname */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1.5">
                    Nickname
                  </p>

                  {editingNickname ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          id="nickname-input"
                          type="text"
                          value={nickInput}
                          onChange={(e) => {
                            setNickInput(e.target.value);
                            setNickError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleNicknameSave();
                            if (e.key === 'Escape') {
                              setEditingNickname(false);
                              setNickInput(nickname ?? '');
                              setNickError(null);
                            }
                          }}
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[color:var(--accent-primary)] transition-colors"
                          placeholder="Enter nickname"
                          autoFocus
                          maxLength={20}
                        />
                        <button
                          id="nickname-save-btn"
                          onClick={() => void handleNicknameSave()}
                          disabled={nickSaving}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center"
                          style={{ background: 'var(--accent-primary)' }}
                          title="Save nickname"
                        >
                          {nickSaving ? (
                            <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingNickname(false);
                            setNickInput(nickname ?? '');
                            setNickError(null);
                          }}
                          className="px-3 py-1.5 border border-white/20 hover:bg-white/5 text-white/60 rounded-lg text-xs transition-all"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {nickError && (
                        <p className="text-xs text-red-400">{nickError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-semibold">
                        {nickname ?? <span className="text-white/40 italic">No nickname set</span>}
                      </span>
                      <button
                        id="nickname-edit-btn"
                        onClick={() => {
                          setEditingNickname(true);
                          setNickInput(nickname ?? '');
                        }}
                        className="p-1.5 rounded-md text-white/30 hover:text-[color:var(--accent-primary)] hover:bg-white/5 transition-all"
                        title="Edit nickname"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Dev */}
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <a
                  id="contact-dev-link"
                  href="mailto:dyl.gauvin@gmail.com?subject=AlbumWall%20Feedback"
                  title="Send feedback, report bugs, or request account deletion"
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-white/60 hover:text-white transition-all duration-200 group"
                >
                  <Mail
                    className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <span>Contact Dev</span>
                  <span className="text-[11px] text-white/25 ml-auto text-right leading-tight hidden sm:block">
                    Bugs · Features · Account deletion
                  </span>
                </a>
              </div>
            </div>

          </div>
        </motion.section>

      </div>
    </div>
  );
}

// ── Section heading divider ─────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25 mb-5 flex items-center gap-3">
      <span className="w-5 h-px bg-white/15" />
      {children}
      <span className="flex-1 h-px bg-white/[0.05]" />
    </h2>
  );
}
