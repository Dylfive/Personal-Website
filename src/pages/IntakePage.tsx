import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Library, Pencil } from 'lucide-react';
import AlbumIntakeForm from '../components/intake/AlbumIntakeForm';
import MusicDashboard from '../components/MusicDashboard';
import type { AlbumEntry } from '../types/album';

export default function IntakePage() {
  const [activeTab, setActiveTab] = useState<'add' | 'collection'>('add');
  const [editingAlbum, setEditingAlbum] = useState<AlbumEntry | null>(null);

  const handleEditAlbum = (album: AlbumEntry) => {
    setEditingAlbum(album);
    setActiveTab('add');
  };

  const handleTabChange = (tab: 'add' | 'collection') => {
    setActiveTab(tab);
    // Clear any in-progress edit when manually switching tabs
    if (tab === 'collection') setEditingAlbum(null);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-10 relative overflow-hidden">
      {/* Background blobs matching the theme */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 max-w-6xl flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-black mb-2">
            Album <span className="gradient-text">Studio</span>
          </h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            {editingAlbum
              ? `Editing "${String(editingAlbum.Album)}" — modify any fields and save.`
              : 'Add new records to your list or explore your full rated album collection and listening stats.'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center p-1.5 bg-white/5 border border-white/10 rounded-2xl mb-10 shadow-lg backdrop-blur-md">
          <button
            onClick={() => handleTabChange('add')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'add'
                ? 'bg-accent-amber text-black shadow-[0_0_18px_rgba(245,166,35,0.35)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {editingAlbum ? (
              <><Pencil className="w-4 h-4" /> Edit Album</>
            ) : (
              <><PlusCircle className="w-4 h-4" /> Add Album</>
            )}
          </button>

          <button
            onClick={() => handleTabChange('collection')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'collection'
                ? 'bg-accent-amber text-black shadow-[0_0_18px_rgba(245,166,35,0.35)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Library className="w-4 h-4" />
            Album Collection
          </button>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'add' ? (
            <motion.div
              key={editingAlbum ? `edit-${String(editingAlbum.Album)}` : 'add'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlbumIntakeForm
                key={editingAlbum ? `edit-${String(editingAlbum.Album)}` : 'new'}
                editAlbum={editingAlbum ?? undefined}
                onEditComplete={() => {
                  setEditingAlbum(null);
                  setActiveTab('collection');
                }}
                onViewCollection={() => handleTabChange('collection')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="collection-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MusicDashboard
                onAddAlbumClick={() => handleTabChange('add')}
                onEditAlbum={handleEditAlbum}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
