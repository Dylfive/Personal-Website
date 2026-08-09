import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PageState = 'idle' | 'loading' | 'success' | 'error';

// ─── CSS-only spinning vinyl record ───────────────────────────────────────────
function VinylRecord() {
  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-accent-amber/5 blur-3xl scale-125 pointer-events-none" />

      {/* The record itself — spins slowly */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 10 }}
        className="w-56 h-56 sm:w-72 sm:h-72 rounded-full relative shadow-2xl"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, #2a2a2a 0%, #1a1a1a 60%, #111 100%)
          `,
        }}
      >
        {/* Grooves — concentric rings */}
        {[84, 72, 60, 48, 36, 24].map((size) => (
          <div
            key={size}
            className="absolute rounded-full border border-white/[0.04]"
            style={{
              width: `${size}%`,
              height: `${size}%`,
              top: `${(100 - size) / 2}%`,
              left: `${(100 - size) / 2}%`,
            }}
          />
        ))}

        {/* Highlight groove sheen */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 120deg, transparent 0%, rgba(255,255,255,0.06) 15%, transparent 30%)',
          }}
        />

        {/* Center label */}
        <div
          className="absolute rounded-full flex flex-col items-center justify-center text-center"
          style={{
            width: '36%',
            height: '36%',
            top: '32%',
            left: '32%',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
          }}
        >
          {/* Label texture lines */}
          <div className="w-full h-px bg-black/10 mb-1" />
          <div className="w-full h-px bg-black/10 mb-1" />
          <p className="text-[8px] sm:text-[10px] font-black text-black/80 leading-none tracking-widest uppercase">
            Album
          </p>
          <p className="text-[6px] sm:text-[8px] font-bold text-black/60 leading-none tracking-widest uppercase">
            Wall
          </p>
          <div className="w-full h-px bg-black/10 mt-1" />
          {/* Center spindle hole */}
          <div className="w-2.5 h-2.5 rounded-full bg-background mt-1 shadow-inner" />
        </div>
      </motion.div>

      {/* Tonearm — static, positioned to the right */}
      <div
        className="absolute pointer-events-none"
        style={{ right: '-6%', top: '8%', width: '28%' }}
      >
        {/* Arm pivot dot */}
        <div className="w-3 h-3 rounded-full bg-white/20 border border-white/10 ml-auto mb-0.5" />
        {/* Arm body */}
        <div
          className="h-0.5 rounded-full origin-right"
          style={{
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 70%, transparent), rgba(255,255,255,0.2))',
            transform: 'rotate(-32deg)',
            transformOrigin: 'right center',
            width: '100%',
          }}
        />
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Already authenticated → go straight to collection
  useEffect(() => {
    if (!loading && user) {
      navigate('/intake', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setPageState('loading');
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/Personal-Website/`,
      },
    });

    if (error) {
      setPageState('error');
      setErrorMsg(error.message);
    } else {
      setPageState('success');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
          className="w-8 h-8 border-2 border-white/10 border-t-accent-amber rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay relative overflow-hidden flex flex-col">
      {/* ── Ambient background gradient ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-amber/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-slate/[0.05] rounded-full blur-[120px]" />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-24 relative z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

          {/* ── LEFT PANEL: Branding + Vinyl ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Vinyl */}
            <div className="mb-10">
              <VinylRecord />
            </div>

            {/* Wordmark */}
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent-amber/70">
                AlbumWall
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif font-black text-white leading-tight mb-4">
              Just a nice place to keep{' '}
              <span className="gradient-text">track of your albums.</span>
            </h1>
            <p className="text-white/40 text-base leading-relaxed max-w-sm">
              Rate everything you've listened to. Browse your collection. See it all laid out exactly how it deserves.
            </p>

            {/* Coming soon chip */}
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-amber/10 border border-accent-amber/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
              <span className="text-xs text-accent-amber/80 font-medium">AlbumWall visual gallery — coming soon</span>
            </div>
          </motion.div>

          {/* ── RIGHT PANEL: Auth form ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          >
            <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
              {/* Amber shimmer line on top */}
              <div className="amber-shimmer-top" />

              <AnimatePresence mode="wait">
                {pageState !== 'success' ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl font-serif font-bold text-white mb-2">
                        Sign in
                      </h2>
                      <p className="text-white/40 text-sm leading-relaxed">
                        Enter your email — we'll send a magic link. No password, no friction.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-accent-amber transition-colors pointer-events-none" />
                        <input
                          id="email-input"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-11 pr-4 py-3.5 bg-white/[0.05] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-amber focus:border-accent-amber/40 text-white placeholder:text-white/20 transition-all text-sm"
                          required
                          autoFocus
                          disabled={pageState === 'loading'}
                        />
                      </div>

                      {pageState === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </motion.div>
                      )}

                      <button
                        id="send-magic-link-btn"
                        type="submit"
                        disabled={pageState === 'loading'}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                      >
                        {pageState === 'loading' ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
                              className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                            />
                            Sending link…
                          </>
                        ) : (
                          <>
                            Send Magic Link
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="text-center text-white/20 text-xs mt-6 leading-relaxed">
                      Click the link in your inbox to sign in — you'll be taken straight to your collection.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="text-center py-6"
                  >
                    {/* Pulsing check */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-accent-amber" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-accent-amber/10 blur-xl animate-pulse" />
                      </div>
                    </div>

                    <h2 className="text-2xl font-serif font-bold mb-3 text-white">
                      Check your inbox ✉️
                    </h2>
                    <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
                      A magic link is on its way to{' '}
                      <span className="text-white font-semibold">{email}</span>.{' '}
                      Click it and you're in.
                    </p>

                    <button
                      onClick={() => { setPageState('idle'); setEmail(''); }}
                      className="mt-8 text-white/25 text-xs hover:text-white/50 transition-colors underline underline-offset-2"
                    >
                      Use a different email
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-white/15 text-xs">
          © {new Date().getFullYear()} Dylan Gauvin
        </p>
      </div>
    </div>
  );
}
