import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Disc3, Calendar, Clock, Music, AlertTriangle, Loader2, Frown, Link as LinkIcon, AlertCircle, Star } from 'lucide-react';
import type { AlbumEntry } from '../../types/album';

interface ReviewScreenProps {
  draft: AlbumEntry;
  onSave: (finalEntry: AlbumEntry) => void;
  onBack: () => void;
  isSubmitting: boolean;
  backLabel?: string;
  isEditMode?: boolean;
}

export function normalizeLengthToHMS(length: string): string {
  if (!length) return '';
  
  const clean = length.trim();
  if (!clean) return '';
  
  const parts = clean.split(':').map(Number);
  
  // If it's MM:SS:00 (Google Sheets format where first part > 3 and 3 parts total)
  if (parts.length === 3 && parts[0] > 3) {
    const totalMinutes = parts[0];
    const seconds = parts[1];
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  }
  
  // If it's already HH:MM:SS
  if (parts.length === 3) {
    return parts.map(p => (isNaN(p) ? 0 : p).toString().padStart(2, '0')).join(':');
  }
  
  // If it's MM:SS
  if (parts.length === 2) {
    const mins = parts[0];
    const secs = parts[1];
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return [
      hrs.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }
  
  return clean;
}

export default function ReviewScreen({ draft, onSave, onBack, isSubmitting, backLabel = 'Edit Search', isEditMode = false }: ReviewScreenProps) {
  const [editedDraft, setEditedDraft] = useState<AlbumEntry>(draft);
  const [ratingInput, setRatingInput] = useState(draft.Rating?.toString() || '');
  const [error, setError] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [googleImages, setGoogleImages] = useState<string[]>([]);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);

  useEffect(() => {
    setEditedDraft({
      ...draft,
      Length: normalizeLengthToHMS(draft.Length)
    });
    setRatingInput(draft.Rating?.toString() || '');
    setError(null);
  }, [draft]);

  const handleChange = (field: keyof AlbumEntry, value: string | number) => {
    setEditedDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveClick = () => {
    setError(null);
    const r = parseFloat(ratingInput);
    if (isNaN(r) || r < 0 || r > 10) {
      setError('Rating must be a number between 0.0 and 10.0');
      return;
    }
    
    // Normalize length to HMS format before saving
    const finalDraft = {
      ...editedDraft,
      Rating: r,
      Length: normalizeLengthToHMS(editedDraft.Length)
    };
    onSave(finalDraft);
  };

  const handleItunesIsShit = async () => {
    setShowImagePicker(true);
    setIsSearchingGoogle(true);
    setGoogleSearchError(null);

    const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const cx = import.meta.env.VITE_GOOGLE_SEARCH_CX;
    const queryStr = `${editedDraft.Album} ${editedDraft.Artist} album cover`;
    const query = encodeURIComponent(queryStr);

    // 1. Try Google Custom Search API if configured
    if (apiKey && cx) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${cx}&key=${apiKey}&searchType=image&num=6`
        );
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const links = data.items.map((item: any) => item.link);
          setGoogleImages(links);
          // Automatically assign the first image from Google!
          handleChange('CoverArt', links[0]);
          setIsSearchingGoogle(false);
          return;
        }
      } catch (err) {
        console.warn('Google Custom Search API error:', err);
      }
    }

    // 2. Fallback to MusicBrainz Cover Art Archive (free, open API, no key required)
    try {
      const mbRes = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=release:"${encodeURIComponent(String(editedDraft.Album))}" AND artist:"${encodeURIComponent(editedDraft.Artist)}"&fmt=json`
      );
      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const release = mbData.releases?.[0];
        if (release?.id) {
          const coverUrl = `https://coverartarchive.org/release/${release.id}/front-500`;
          const imgCheck = await fetch(coverUrl, { method: 'HEAD' });
          if (imgCheck.ok) {
            handleChange('CoverArt', coverUrl);
            setGoogleImages([coverUrl]);
            setIsSearchingGoogle(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('MusicBrainz fetch error:', err);
    }

    // 3. Fallback to opening Google Image Search tab for manual selection
    setIsSearchingGoogle(false);
    setGoogleSearchError('Auto-fetch failed. Opened Google Search — copy & paste an image URL below.');
    window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex gap-4 mb-6">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {editedDraft.CoverArt ? (
            <img src={editedDraft.CoverArt} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <Music className="w-10 h-10 text-white/30" />
          )}
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-white">{editedDraft.Album}</h3>
          <p className="text-neon-purple text-lg">{editedDraft.Artist}</p>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="inline-flex px-3 py-1 bg-white/5 rounded-full border border-white/10 text-sm font-bold">
              Rating: {editedDraft.Rating}/10
            </span>
            <button
              type="button"
              onClick={handleItunesIsShit}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-full text-sm font-bold transition-colors"
            >
              <Frown className="w-4 h-4" /> iTunes API is shit
            </button>
          </div>
        </div>
      </div>

      {showImagePicker && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-white/70">
              <LinkIcon className="w-4 h-4" /> Custom Cover Art URL
            </label>
            <input
              type="text"
              value={editedDraft.CoverArt}
              onChange={(e) => handleChange('CoverArt', e.target.value)}
              placeholder="Paste image URL here..."
              className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white text-sm"
            />
          </div>
          
          {isSearchingGoogle && (
            <div className="flex items-center gap-2 text-neon-purple text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching Google...
            </div>
          )}

          {googleSearchError && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>{googleSearchError}</p>
            </div>
          )}

          {!isSearchingGoogle && googleImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {googleImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChange('CoverArt', img)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${editedDraft.CoverArt === img ? 'border-neon-purple scale-95' : 'border-transparent hover:border-white/30'}`}
                >
                  <img src={img} alt={`Google Result ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Disc3 className="w-4 h-4 text-neon-purple" /> Genres
          </label>
          <input
            type="text"
            value={editedDraft.Genre}
            onChange={(e) => handleChange('Genre', e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Calendar className="w-4 h-4 text-neon-purple" /> Release Year
          </label>
          <input
            type="number"
            value={editedDraft['Release Year']}
            onChange={(e) => handleChange('Release Year', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Clock className="w-4 h-4 text-neon-purple" /> Total Length
          </label>
          <input
            type="text"
            value={editedDraft.Length}
            onChange={(e) => handleChange('Length', e.target.value)}
            placeholder="HH:MM:SS"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue text-white font-mono"
          />
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Music className="w-4 h-4" /> Track Count
          </label>
          <input
            type="number"
            value={editedDraft.TrackCount}
            onChange={(e) => handleChange('TrackCount', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue text-white font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Star className="w-4 h-4 text-accent-amber fill-accent-amber" /> Rating (0.0 - 10.0)
          </label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={ratingInput}
            onChange={(e) => {
              setRatingInput(e.target.value);
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handleChange('Rating', val);
              }
            }}
            placeholder="0.0"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue text-white font-mono"
          />
        </div>

        {/* Tiebreaker / Rank Priority (Edit Mode Only) */}
        {isEditMode && (
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-white/70">
              Tiebreaker Priority <span className="text-xs text-white/40 font-normal">(for albums with same rating, e.g. 1 for your #1 10/10, 2 for #2)</span>
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={editedDraft.RankOrder ?? ''}
              onChange={(e) => handleChange('RankOrder', e.target.value ? parseInt(e.target.value) : (undefined as any))}
              placeholder="e.g. 1 (1st best), 2 (2nd best)..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-amber text-white font-mono text-sm"
            />
          </div>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold border border-white/20 text-white hover:bg-white/5 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
          {backLabel}
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSubmitting}
          className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg bg-white text-black hover:bg-white/90 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
             <span className="flex items-center gap-2">
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full" />
               Saving...
             </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              Confirm & Save
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
