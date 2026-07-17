import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import RatingInput from './RatingInput';
import ReviewScreen from './ReviewScreen';
import { appendAlbumToGitHub, fetchGitHubAlbums } from '../../lib/albumStore';
import { enrichAlbumData } from '../../lib/aiEnrichment';
import type { AlbumEntry } from '../../types/album';
import rawAlbumData from '../../data/Album-Data.json';

type FormState = 'IDLE' | 'ENRICHING' | 'REVIEW' | 'SUBMITTING' | 'SUCCESS';

export default function AlbumIntakeForm() {
  const [formState, setFormState] = useState<FormState>('IDLE');
  
  // Initial inputs
  const [albumName, setAlbumName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [rating, setRating] = useState('');
  
  // AI Draft
  const [draft, setDraft] = useState<AlbumEntry | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  const handleEnrich = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!albumName.trim() || !artistName.trim() || !rating.trim()) {
      setError('Please fill in all required fields (Album, Artist, Rating).');
      return;
    }

    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 0 || numRating > 10) {
      setError('Rating must be a number between 0.0 and 10.0.');
      return;
    }

    // Duplicate check
    if (!bypassDuplicate) {
      setFormState('ENRICHING');
      try {
        const liveAlbums = await fetchGitHubAlbums();
        const existing = liveAlbums.find(
          (a) => String(a.Album).toLowerCase().trim() === albumName.toLowerCase().trim()
        );
        if (existing) {
          setDuplicateWarning(`"${existing.Album}" by ${existing.Artist} is already in your list with a rating of ${existing.Rating}/10. Are you sure you want to add it again?`);
          setFormState('IDLE');
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch live data for duplicate check', err);
        const existing = (rawAlbumData as AlbumEntry[]).find(
          (a) => String(a.Album).toLowerCase().trim() === albumName.toLowerCase().trim()
        );
        if (existing) {
          setDuplicateWarning(`"${existing.Album}" by ${existing.Artist} is already in your list with a rating of ${existing.Rating}/10. Are you sure you want to add it again?`);
          setFormState('IDLE');
          return;
        }
      }
    }

    setDuplicateWarning(null);
    setBypassDuplicate(false);
    setFormState('ENRICHING');
    try {
      const enriched = await enrichAlbumData(albumName.trim(), artistName.trim(), numRating);
      setDraft(enriched);
      setFormState('REVIEW');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI Enrichment failed.');
      setFormState('IDLE');
    }
  };

  const handleSave = async (finalEntry: AlbumEntry) => {
    setFormState('SUBMITTING');
    setError(null);
    try {
      await appendAlbumToGitHub(finalEntry);
      
      // Clear
      setAlbumName('');
      setArtistName('');
      setRating('');
      setDraft(null);
      setFormState('SUCCESS');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
      setFormState('REVIEW'); // Go back to review so they don't lose data
    }
  };

  const handleReset = () => {
    setFormState('IDLE');
    setSuccessMessageRead(); // Or just let them start over
    setAlbumName('');
    setArtistName('');
    setRating('');
    setDraft(null);
    setError(null);
  };

  const setSuccessMessageRead = () => {}; // Dummy

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        layout
        className="glass-panel p-6 sm:p-8 rounded-3xl neon-border overflow-hidden relative"
      >
        <AnimatePresence mode="wait">
          
          {/* IDLE STATE */}
          {formState === 'IDLE' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Add New Album</h2>
                <p className="text-white/50 text-sm">Enter the details and let AI do the rest.</p>
              </div>

              <form onSubmit={handleEnrich} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Album Name</label>
                    <input
                      type="text"
                      value={albumName}
                      onChange={(e) => setAlbumName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white transition-all"
                      placeholder="e.g. The Dark Side of the Moon"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Artist Name</label>
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white transition-all"
                      placeholder="e.g. Pink Floyd"
                    />
                  </div>
                </div>

                <RatingInput value={rating} onChange={setRating} />

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}

                {duplicateWarning && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{duplicateWarning}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBypassDuplicate(true); setDuplicateWarning(null); }}
                      className="w-full py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 font-bold transition-colors"
                    >
                      Add Anyway (Re-rate)
                    </button>
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg bg-neon-purple text-white hover:bg-neon-purple/80 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Research & Enrich
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ENRICHING STATE */}
          {formState === 'ENRICHING' && (
            <motion.div
              key="enriching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center py-20 text-center space-y-6"
            >
              <div className="relative w-20 h-20">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, ease: "linear", duration: 3 }} 
                  className="absolute inset-0 rounded-full border-t-2 border-neon-purple border-opacity-50"
                />
                <motion.div 
                  animate={{ rotate: -360 }} 
                  transition={{ repeat: Infinity, ease: "linear", duration: 2 }} 
                  className="absolute inset-2 rounded-full border-b-2 border-neon-blue border-opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-neon-purple animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">AI is working...</h3>
                <p className="text-white/50 text-sm max-w-xs mx-auto">
                  Searching iTunes and asking Gemini for genres, release year, and album length...
                </p>
              </div>
            </motion.div>
          )}

          {/* REVIEW & SUBMITTING STATE */}
          {(formState === 'REVIEW' || formState === 'SUBMITTING') && draft && (
            <motion.div key="review">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="text-neon-purple w-6 h-6" /> Review Draft
                </h2>
                <p className="text-white/50 text-sm">Please verify the AI's research. Edit anything that looks wrong.</p>
              </div>
              
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              <ReviewScreen 
                draft={draft}
                onSave={handleSave}
                onBack={() => setFormState('IDLE')}
                isSubmitting={formState === 'SUBMITTING'}
              />
            </motion.div>
          )}

          {/* SUCCESS STATE */}
          {formState === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Album Saved!</h3>
              <p className="text-white/50 mb-8 max-w-sm">
                Your album was successfully pushed to GitHub. The changes will be live shortly.
              </p>
              <button
                onClick={handleReset}
                className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-white/90 transition-colors"
              >
                Add Another Album
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
