import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Users, Loader2, RefreshCw, Star,
  KeyRound, ExternalLink, Music, Disc3, Check
} from 'lucide-react';
import type { AlbumEntry } from '../types/album';
import { getAlbumRecommendations, type AlbumRecommendation } from '../lib/aiEnrichment';
import { getCommunityRecommendations, type CommunityRecommendation } from '../lib/recommendationStore';

interface RecommendationsPanelProps {
  album: AlbumEntry;
  allAlbums?: AlbumEntry[];
}

type TabMode = 'ai' | 'community';

function generateGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 120) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,30%), hsl(${h2},80%,20%))`;
}

export default function RecommendationsPanel({ album, allAlbums = [] }: RecommendationsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('community');

  // AI State
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [aiRecs, setAiRecs] = useState<AlbumRecommendation[]>([]);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Community State
  const [commState, setCommState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [commRecs, setCommRecs] = useState<CommunityRecommendation[]>([]);

  // Check if Gemini key exists
  const hasGeminiKey = Boolean(
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    localStorage.getItem('GEMINI_API_KEY')
  );

  // Reset when selected album changes
  useEffect(() => {
    setAiState('idle');
    setAiRecs([]);
    setAiErrorMsg('');
    setShowKeyInput(false);
    setCommState('idle');
    setCommRecs([]);
  }, [album]);

  // Automatically compute community recommendations when tab opens or album changes
  useEffect(() => {
    if (activeTab === 'community') {
      let cancelled = false;
      setCommState('loading');
      getCommunityRecommendations(album, allAlbums)
        .then((recs) => {
          if (!cancelled) {
            setCommRecs(recs);
            setCommState('done');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCommState('done');
          }
        });

      return () => {
        cancelled = true;
      };
    }
  }, [album, allAlbums, activeTab]);

  const generateAiRecs = async (overrideKey?: string) => {
    if (overrideKey) {
      localStorage.setItem('GEMINI_API_KEY', overrideKey.trim());
      setShowKeyInput(false);
      setKeySavedToast(true);
      setTimeout(() => setKeySavedToast(false), 3000);
    }

    const key = overrideKey?.trim() ||
      (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
      localStorage.getItem('GEMINI_API_KEY');

    if (!key) {
      setShowKeyInput(true);
      return;
    }

    setAiState('loading');
    setAiErrorMsg('');

    try {
      const results = await getAlbumRecommendations(album, allAlbums);
      setAiRecs(results);
      setAiState('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'NO_API_KEY') {
        setShowKeyInput(true);
        setAiState('idle');
      } else {
        setAiErrorMsg('Failed to get recommendations. Check your API key and network connection.');
        setAiState('error');
      }
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-white/[0.08]">
      {/* ── Mode Switcher Tabs ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'community'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[color:var(--accent-primary)]" />
            <span>Community Matches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ai'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Recommendations</span>
          </button>
        </div>

        {activeTab === 'ai' && hasGeminiKey && !showKeyInput && (
          <button
            type="button"
            onClick={() => setShowKeyInput(true)}
            title="Edit Gemini API Key"
            className="text-[11px] text-white/40 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            <KeyRound className="w-3 h-3" />
            <span>Key</span>
          </button>
        )}
      </div>

      {keySavedToast && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> API Key saved successfully
        </motion.div>
      )}

      {/* ─── TAB 1: COMMUNITY RECOMMENDATIONS ──────────────────────────────── */}
      {activeTab === 'community' && (
        <div>
          {commState === 'loading' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-[color:var(--accent-primary)] animate-spin" />
              <p className="text-white/40 text-xs">Finding similar user albums…</p>
            </div>
          )}

          {commState === 'done' && commRecs.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-white/40 mb-1 px-1">
                <span>Top matches from user collections</span>
                <span>Genre · Era · Runtime</span>
              </div>
              {commRecs.map((rec, i) => {
                const hasCover = rec.album.CoverArt && rec.album.CoverArt !== 'Not Found';
                const searchUrl = `https://music.apple.com/search?term=${encodeURIComponent(`${rec.album.Album} ${rec.album.Artist}`)}`;

                return (
                  <motion.div
                    key={`${rec.album.Album}-${rec.album.Artist}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.2 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-[color:var(--accent-primary)]/30 hover:bg-white/[0.06] transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Album art */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/15 shadow-md bg-black/40">
                        {hasCover ? (
                          <img
                            src={rec.album.CoverArt}
                            alt={String(rec.album.Album)}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: generateGradient(String(rec.album.Album) + rec.album.Artist) }}
                          >
                            <Music className="w-4 h-4 text-white/30" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-white text-sm font-bold truncate group-hover:text-[color:var(--accent-primary)] transition-colors">
                            {String(rec.album.Album)}
                          </h5>
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[color:var(--accent-primary)]/15 text-[color:var(--accent-primary)] border border-[color:var(--accent-primary)]/30 text-[10px] font-black">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {rec.album.Rating.toFixed(1)}
                          </span>
                        </div>

                        <p className="text-xs text-white/70 truncate mt-0.5">
                          {rec.album.Artist} {rec.album['Release Year'] ? `· ${rec.album['Release Year']}` : ''}
                        </p>

                        <p className="text-white/45 text-[11px] mt-1.5 leading-snug">
                          {rec.reason}
                        </p>
                      </div>

                      {/* External search */}
                      <a
                        href={rec.album.AppleMusicLink || searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Listen / Search"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all flex-shrink-0 self-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {commState === 'done' && commRecs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
              <Disc3 className="w-6 h-6 text-white/30 mx-auto mb-2" />
              <p className="text-white/50 text-xs mb-1 font-medium">No other matching user albums yet</p>
              <p className="text-white/30 text-[11px]">
                As more albums are added across user collections, community recommendations will appear here. Try AI recommendations!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: AI RECOMMENDATIONS ────────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div>
          {/* Key input card */}
          {showKeyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Gemini API Key</h5>
              </div>
              <p className="text-white/60 text-xs mb-3 leading-relaxed">
                Provide a free Gemini API key to enable AI recommendations. Keys are saved locally in your browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60"
                />
                <button
                  type="button"
                  onClick={() => generateAiRecs(apiKeyInput)}
                  disabled={!apiKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 disabled:opacity-40 transition-all"
                >
                  Save & Generate
                </button>
              </div>
              <div className="flex justify-between items-center mt-2.5 text-[11px]">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400/80 hover:text-amber-300 inline-flex items-center gap-1 underline"
                >
                  Get free Gemini API Key ↗
                </a>
                {hasGeminiKey && (
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(false)}
                    className="text-white/40 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Idle state */}
          {aiState === 'idle' && !showKeyInput && (
            <div className="rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/[0.03] p-5 text-center">
              <Sparkles className="w-6 h-6 text-amber-400/70 mx-auto mb-2" />
              <p className="text-white/50 text-xs mb-4 leading-relaxed">
                Discover 3 albums similar to{' '}
                <span className="text-white font-semibold">{String(album.Album)}</span>{' '}
                using Gemini AI.
              </p>
              <button
                type="button"
                id="generate-recommendations-btn"
                onClick={() => generateAiRecs()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs transition-all duration-200 hover:scale-105 active:scale-95 text-white"
                style={{
                  background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                  boxShadow: '0 0 16px var(--accent-glow)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate AI Recommendations
              </button>
            </div>
          )}

          {/* Loading state */}
          {aiState === 'loading' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              <p className="text-white/40 text-xs">Asking Gemini for recommendations…</p>
            </div>
          )}

          {/* Error state */}
          {aiState === 'error' && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
              <p className="text-red-400 text-xs mb-3 leading-relaxed">{aiErrorMsg}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => generateAiRecs()}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Try again
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyInput(true)}
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs transition-colors"
                >
                  <KeyRound className="w-3 h-3" /> Update API Key
                </button>
              </div>
            </div>
          )}

          {/* Done / results state */}
          {aiState === 'done' && aiRecs.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-white/40 mb-1 px-1">
                <span>Gemini AI Suggestions</span>
                <button
                  type="button"
                  onClick={() => generateAiRecs()}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
              </div>
              {aiRecs.map((rec, i) => {
                const searchUrl = `https://music.apple.com/search?term=${encodeURIComponent(`${rec.title} ${rec.artist}`)}`;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.2 }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-amber-400/30 hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                        style={{
                          background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                          color: 'var(--accent-primary)',
                          border: '1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white text-sm font-bold truncate group-hover:text-amber-300 transition-colors">
                            {rec.title}
                          </p>
                          <a
                            href={searchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Search album"
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--accent-primary)' }}>
                          {rec.artist}
                        </p>
                        <p className="text-white/45 text-xs mt-1.5 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
