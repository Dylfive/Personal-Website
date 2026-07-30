import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PageState = 'idle' | 'loading' | 'success' | 'error';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, go straight to intake
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
        // After clicking the magic link, the SDK processes the token and the
        // onAuthStateChange fires, which redirects them to /intake via the effect above.
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

  // Don't flash the form while auth resolves on initial load
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
          className="w-8 h-8 border-2 border-white/20 border-t-neon-purple rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-panel rounded-3xl neon-border p-8 sm:p-10 w-full max-w-md relative overflow-hidden"
      >
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent opacity-60" />

        <AnimatePresence mode="wait">
          {pageState !== 'success' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-neon-purple" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-neon-purple/20 blur-xl -z-10" />
                </div>
              </div>

              {/* Heading */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black mb-2">
                  Welcome <span className="gradient-text">In</span>
                </h1>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                  Enter your email to receive a magic sign-in link. No password, no hassle.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-neon-purple transition-colors pointer-events-none" />
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-neon-purple/50 text-white placeholder:text-white/25 transition-all"
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
                  className="w-full btn-primary flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {pageState === 'loading' ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, ease: 'linear', duration: 0.9 }}
                        className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
                      />
                      Sending link…
                    </>
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-white/25 text-xs mt-6">
                We'll email you a link. Click it to sign in instantly — no password ever needed.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-center py-4"
            >
              {/* Pulsing check icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-neon-purple" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-neon-purple/15 blur-xl animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-black mb-3">Check your inbox ✉️</h2>
              <p className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
                A magic link is on its way to{' '}
                <span className="text-white font-semibold">{email}</span>.
                <br className="hidden sm:block" />
                Click it and you're in — the page will update automatically.
              </p>

              <button
                onClick={() => { setPageState('idle'); setEmail(''); }}
                className="mt-8 text-white/35 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
              >
                Use a different email
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
