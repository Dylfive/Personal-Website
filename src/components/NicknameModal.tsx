import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateNickname } from '../lib/profileStore';

/**
 * Full-screen overlay shown once when an authenticated user has no nickname.
 * Dismissed only after a successful save.
 */
export default function NicknameModal() {
  const { saveNickname } = useAuth();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErr = validateNickname(value);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSaving(true);
    const serverErr = await saveNickname(value.trim());
    setSaving(false);

    if (serverErr) {
      setError(serverErr);
    }
    // On success, parent removes this modal (nickname is now set in context)
  };

  return (
    <AnimatePresence>
      <motion.div
        key="nickname-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(13,13,15,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel rounded-3xl p-8 sm:p-10 w-full max-w-md relative overflow-hidden border border-white/10"
        >
          {/* Amber shimmer top */}
          <div className="amber-shimmer-top" />

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center">
              <User className="w-8 h-8 text-accent-amber" />
            </div>
          </div>

          {/* Copy */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-2">
              Pick a nickname
            </h2>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
              This is how you'll appear on the leaderboard and to other users.
              Keep it short and fun.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <input
                id="nickname-input"
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. vinylhead42"
                maxLength={20}
                autoFocus
                disabled={saving}
                className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-amber focus:border-accent-amber/40 text-white placeholder:text-white/20 transition-all text-sm disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/25 font-mono select-none">
                {value.length}/20
              </span>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="save-nickname-btn"
              type="submit"
              disabled={saving || !value.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Set Nickname
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-5 leading-relaxed">
            2–20 characters · visible to other users on the leaderboard
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
