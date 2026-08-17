import { useNavigate } from 'react-router-dom';
import MusicDashboard from '../components/MusicDashboard';
import type { AlbumEntry } from '../types/album';

/**
 * Collection page — renders the full MusicDashboard.
 * Adding / editing albums now lives on its own /add route (AddAlbumPage).
 */
export default function IntakePage() {
  const navigate = useNavigate();

  const handleEditAlbum = (album: AlbumEntry) => {
    navigate('/add', { state: { editAlbum: album } });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-10 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto relative z-10 max-w-6xl">
        <MusicDashboard
          onAddAlbumClick={() => navigate('/add')}
          onEditAlbum={handleEditAlbum}
        />
      </div>
    </div>
  );
}
