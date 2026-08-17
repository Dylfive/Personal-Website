import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil } from 'lucide-react';
import AlbumIntakeForm from '../components/intake/AlbumIntakeForm';
import type { AlbumEntry } from '../types/album';

export default function AddAlbumPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [editingAlbum, setEditingAlbum] = useState<AlbumEntry | null>(null);

  // Support the existing edit-from-wall navigation pattern:
  // navigate('/add', { state: { editAlbum: album } })
  // Mount-only: state is set once when the page loads; navigating here again
  // with a different album will remount this component, re-running the effect.
  useEffect(() => {
    const state = location.state as { editAlbum?: AlbumEntry } | null;
    if (state?.editAlbum) {
      setEditingAlbum(state.editAlbum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEditMode = !!editingAlbum;

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-10 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 max-w-6xl flex flex-col items-center">

        {/* Back breadcrumb */}
        <div className="w-full max-w-2xl mb-6">
          <button
            id="back-to-collection-btn"
            onClick={() => navigate('/intake')}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            My Collection
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-black mb-2">
            {isEditMode ? (
              <>
                <Pencil className="inline w-6 h-6 text-white/40 mb-1 mr-2" />
                Edit{' '}
                <span className="gradient-text">
                  &ldquo;{String(editingAlbum.Album)}&rdquo;
                </span>
              </>
            ) : (
              <>
                <span className="gradient-text">Add an Album</span>
              </>
            )}
          </h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            {isEditMode
              ? 'Modify any fields below and save your changes.'
              : 'Search for an album to log it to your collection.'}
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <AlbumIntakeForm
            key={isEditMode ? `edit-${String(editingAlbum.Album)}` : 'new'}
            editAlbum={editingAlbum ?? undefined}
            onEditComplete={() => navigate('/intake')}
            onViewCollection={() => navigate('/intake')}
          />
        </motion.div>

      </div>
    </div>
  );
}
