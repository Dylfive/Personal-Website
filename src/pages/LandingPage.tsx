import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutGrid, Users, FileText, ArrowRight, Disc3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Spinning vinyl decoration ────────────────────────────────────────────────
function MiniVinyl() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 12 }}
      className="w-32 h-32 sm:w-40 sm:h-40 rounded-full relative shadow-2xl select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #1a1a1a 60%, #111 100%)',
      }}
    >
      {[80, 65, 50, 35].map((size) => (
        <div
          key={size}
          className="absolute rounded-full border border-white/[0.05]"
          style={{
            width: `${size}%`,
            height: `${size}%`,
            top: `${(100 - size) / 2}%`,
            left: `${(100 - size) / 2}%`,
          }}
        />
      ))}
      {/* Center label */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: '34%',
          height: '34%',
          top: '33%',
          left: '33%',
          background:
            'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
        }}
      >
        <div className="w-2 h-2 rounded-full bg-background shadow-inner" />
      </div>
    </motion.div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
interface CardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

function FeatureCard({ to, icon, title, description, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
    >
      <Link
        to={to}
        className="group block glass-panel rounded-2xl p-6 sm:p-7 hover:bg-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl border border-white/[0.06] hover:border-white/[0.12]"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/10 group-hover:bg-accent-amber/10 group-hover:border-accent-amber/30 transition-all duration-300">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base font-bold text-white group-hover:text-[color:var(--accent-primary)] transition-colors">
                {title}
              </h3>
              <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-[color:var(--accent-primary)] group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <p className="text-sm text-white/40 leading-relaxed">{description}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [dylanId, setDylanId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('user_id')
          .ilike('nickname', 'Dylan')
          .limit(1);
        if (data && data.length > 0) setDylanId(data[0].user_id as string);
      } catch {
        // ignore
      }
    })();
  }, []);

  const dylanWallPath = dylanId ? `/wall/${dylanId}` : '/wall';

  return (
    <div className="min-h-screen bg-background noise-overlay relative overflow-hidden flex flex-col">
      {/* ── Ambient blobs ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-80px] left-1/3 w-[700px] h-[700px] bg-accent-amber/[0.035] rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-slate/[0.045] rounded-full blur-[120px]" />
      </div>

      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-16 relative z-10">
        {/* Vinyl + wordmark row */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col items-center mb-10"
        >
          <MiniVinyl />

          {/* Wordmark */}
          <div className="mt-6 flex items-center gap-2.5">
            <Disc3 className="w-5 h-5 text-[color:var(--accent-primary)]" />
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent-amber/70">
              AlbumWall
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          className="text-center max-w-2xl mb-4"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-white leading-tight mb-5">
            Rate every{' '}
            <span className="gradient-text">album</span> you've ever heard.
          </h1>
          <p className="text-white/40 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
            Dylan's personal music wall — rate albums, build your collection,
            and explore what others are listening to.
          </p>
        </motion.div>

        {/* ── Feature cards ── */}
        <div className="w-full max-w-2xl mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            to={dylanWallPath}
            icon={<LayoutGrid className="w-5 h-5 text-[color:var(--accent-primary)]" />}
            title="Dylan's Wall"
            description="Browse Dylan's rated album collection."
            delay={0.2}
          />
          <FeatureCard
            to="/leaderboard"
            icon={<Users className="w-5 h-5 text-[color:var(--accent-primary)]" />}
            title="Other Walls"
            description="See what everyone else is listening to."
            delay={0.28}
          />
          <FeatureCard
            to="/resume"
            icon={<FileText className="w-5 h-5 text-[color:var(--accent-primary)]" />}
            title="Resume"
            description="Check out Dylan's background and experience."
            delay={0.36}
          />
        </div>

        {/* Sign-in nudge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 text-white/25 text-sm"
        >
          Want to build your own wall?{' '}
          <Link
            to="/login"
            className="text-[color:var(--accent-primary)] hover:text-white transition-colors underline underline-offset-2"
          >
            Sign in
          </Link>{' '}
          — it's free and passwordless.
        </motion.p>
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-white/15 text-xs">© {new Date().getFullYear()} Dylan Gauvin</p>
      </div>
    </div>
  );
}
