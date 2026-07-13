import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Disc3, Calendar, Clock, Music, AlertTriangle, Loader2, Frown, Link as LinkIcon } from 'lucide-react';
import type { AlbumEntry } from '../../types/album';

interface ReviewScreenProps {
  draft: AlbumEntry;
  onSave: (finalEntry: AlbumEntry) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function ReviewScreen({ draft, onSave, onBack, isSubmitting }: ReviewScreenProps) {
  const [editedDraft, setEditedDraft] = useState<AlbumEntry>(draft);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [googleImages, setGoogleImages] = useState<string[]>([]);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);

  const handleChange = (field: keyof AlbumEntry, value: string | number) => {
    setEditedDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleItunesIsShit = async () => {
    setShowImagePicker(true);
    
    const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const cx = import.meta.env.VITE_GOOGLE_SEARCH_CX;
    const query = encodeURIComponent(`${editedDraft.Album} ${editedDraft.Artist} album cover`);

    if (!apiKey || !cx) {
      // Option 1 Fallback
      window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
      setGoogleSearchError('No Google API keys found. Opened a manual search tab. Paste the image URL below.');
      return;
    }

    setIsSearchingGoogle(true);
    setGoogleSearchError(null);
    try {
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?q=${query}&cx=${cx}&key=${apiKey}&searchType=image&num=4`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setGoogleImages(data.items.map((item: any) => item.link));
      } else {
        setGoogleSearchError('No results found from Google Custom Search.');
        window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
      }
    } catch (err) {
      setGoogleSearchError('Failed to fetch from Google Custom Search. Opened a manual search tab.');
      window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
    } finally {
      setIsSearchingGoogle(false);
    }
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
            <Disc3 className="w-4 h-4" /> Genres
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
            <Calendar className="w-4 h-4" /> Release Year
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
            <Clock className="w-4 h-4" /> Total Length
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
          <label className="block text-sm font-medium text-white/70 mb-2">Track Count</label>
          <input
            type="number"
            value={editedDraft.TrackCount}
            onChange={(e) => handleChange('TrackCount', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue text-white font-mono"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold border border-white/20 text-white hover:bg-white/5 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
          Edit Search
        </button>
        <button
          type="button"
          onClick={() => onSave(editedDraft)}
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
