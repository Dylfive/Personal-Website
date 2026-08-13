import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, CheckCircle2, ArrowRight, AlertTriangle, Pencil } from 'lucide-react';
import RatingInput from './RatingInput';
import ReviewScreen from './ReviewScreen';
import PlatformSelector from './PlatformSelector';
import {
  appendAlbumToGitHub,
  getUserAlbums,
  addUserAlbum,
  updateUserAlbum,
  deleteUserAlbum,
  updateAlbumOnGitHub,
} from '../../lib/albumStore';
import { enrichAlbumData } from '../../lib/aiEnrichment';
import type { AlbumEntry } from '../../types/album';
import rawAlbumData from '../../data/Album-Data.json';
import { useAuth } from '../../contexts/AuthContext';

type FormState = 'IDLE' | 'ENRICHING' | 'REVIEW' | 'SUBMITTING' | 'SUCCESS';

interface AlbumIntakeFormProps {
  onViewCollection?: () => void;
  /** When set, the form opens pre-filled in edit mode for this album. */
  editAlbum?: AlbumEntry;
  /** Called after a successful edit save (e.g. to navigate back to the collection). */
  onEditComplete?: () => void;
}

export default function AlbumIntakeForm({
  onViewCollection,
  editAlbum,
  onEditComplete,
}: AlbumIntakeFormProps = {}) {
  const isEditMode = !!editAlbum;
  // Lock in the original name at mount time so we can find & delete it on save.
  const originalAlbumName = useRef<string>(editAlbum ? String(editAlbum.Album) : '');

  const [formState, setFormState] = useState<FormState>(isEditMode ? 'REVIEW' : 'IDLE');

  // Initial inputs (used in add mode only)
  const [albumName, setAlbumName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [rating, setRating] = useState('');
  const [customStreamingLink, setCustomStreamingLink] = useState('');

  // Draft (pre-populated with editAlbum in edit mode)
  const [draft, setDraft] = useState<AlbumEntry | null>(editAlbum ?? null);

  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  const { user } = useAuth();

  // ── Add-mode: enrich & duplicate check ─────────────────────────────────────
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
        const userAlbums = await getUserAlbums(user?.id);
        const existing = userAlbums.find(
          (a) => String(a.Album).toLowerCase().trim() === albumName.toLowerCase().trim()
        );
        if (existing) {
          setDuplicateWarning(
            `"${existing.Album}" by ${existing.Artist} is already in your list with a rating of ${existing.Rating}/10. Are you sure you want to add it again?`
          );
          setFormState('IDLE');
          return;
        }
      } catch {
        const existing = (rawAlbumData as AlbumEntry[]).find(
          (a) => String(a.Album).toLowerCase().trim() === albumName.toLowerCase().trim()
        );
        if (existing) {
          setDuplicateWarning(
            `"${existing.Album}" by ${existing.Artist} is already in your list with a rating of ${existing.Rating}/10. Are you sure you want to add it again?`
          );
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
      if (customStreamingLink) {
        enriched.AppleMusicLink = customStreamingLink;
      }
      setDraft(enriched);
      setFormState('REVIEW');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI Enrichment failed.');
      setFormState('IDLE');
    }
  };

  // ── Save (add or edit) ──────────────────────────────────────────────────────
  const handleSave = async (finalEntry: AlbumEntry) => {
    setFormState('SUBMITTING');
    setError(null);
    try {
      if (user?.id) {
        if (isEditMode) {
          await updateUserAlbum(user.id, originalAlbumName.current, finalEntry);
        } else {
          await addUserAlbum(user.id, finalEntry);
        }
      } else {
        if (isEditMode) {
          await updateAlbumOnGitHub(originalAlbumName.current, finalEntry);
        } else {
          await appendAlbumToGitHub(finalEntry);
        }
      }

      setFormState('SUCCESS');

      // In edit mode, auto-navigate back to collection after a brief flash
      if (isEditMode) {
        setTimeout(() => onEditComplete?.(), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
      setFormState('REVIEW');
    }
  };

  // ── Delete (edit-mode only) ──────────────────────────────────────────────────
  const handleDelete = async () => {
    setFormState('SUBMITTING');
    setError(null);
    try {
      if (user?.id && originalAlbumName.current) {
        await deleteUserAlbum(user.id, originalAlbumName.current);
      }
      setFormState('SUCCESS');
      setTimeout(() => onEditComplete?.(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting.');
      setFormState('REVIEW');
    }
  };

  // ── Reset (add-mode only) ───────────────────────────────────────────────────
  const handleReset = () => {
    setFormState('IDLE');
    setAlbumName('');
    setArtistName('');
    setRating('');
    setDraft(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        layout
        className="glass-panel p-6 sm:p-8 rounded-3xl neon-border overflow-hidden relative"
      >
        <AnimatePresence mode="wait">

          {/* ── IDLE (add mode) ── */}
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

                <PlatformSelector
                  albumName={albumName}
                  artistName={artistName}
                  currentLink={customStreamingLink}
                  onSelectPlatform={(_platform, generatedLink) => {
                    setCustomStreamingLink(generatedLink);
                  }}
                  title="Where did you listen to this album?"
                />

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

          {/* ── ENRICHING ── */}
          {formState === 'ENRICHING' && (
            <motion.div
              key="enriching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center py-20 text-center space-y-6"
            >
              <div className="relative w-20 h-20">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 3 }} className="absolute inset-0 rounded-full border-t-2 border-neon-purple border-opacity-50" />
                <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 2 }} className="absolute inset-2 rounded-full border-b-2 border-neon-blue border-opacity-50" />
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

          {/* ── REVIEW & SUBMITTING ── */}
          {(formState === 'REVIEW' || formState === 'SUBMITTING') && draft && (
            <motion.div key="review">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  {isEditMode ? (
                    <><Pencil className="text-accent-amber w-6 h-6" /> Edit Album</>
                  ) : (
                    <><Sparkles className="text-neon-purple w-6 h-6" /> Review Draft</>
                  )}
                </h2>
                <p className="text-white/50 text-sm">
                  {isEditMode
                    ? 'Modify any fields below, then save your changes.'
                    : "Please verify the AI's research. Edit anything that looks wrong."}
                </p>
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
                onBack={isEditMode ? () => onEditComplete?.() : () => setFormState('IDLE')}
                onDelete={isEditMode ? handleDelete : undefined}
                isSubmitting={formState === 'SUBMITTING'}
                backLabel={isEditMode ? 'Cancel' : 'Edit Search'}
                isEditMode={isEditMode}
              />
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
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
              <h3 className="text-2xl font-bold mb-2">
                {isEditMode ? 'Album Updated!' : 'Album Saved!'}
              </h3>
              <p className="text-white/50 mb-8 max-w-sm">
                {isEditMode
                  ? 'Your changes have been saved. Heading back to your collection…'
                  : 'Your album was successfully pushed to GitHub. The changes will be live shortly.'}
              </p>

              {!isEditMode && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-white/90 transition-colors"
                  >
                    Add Another Album
                  </button>
                  {onViewCollection && (
                    <button
                      onClick={onViewCollection}
                      className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-colors"
                    >
                      View Collection 📊
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
