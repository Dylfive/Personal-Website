import { useState, useEffect } from 'react';
import PinGate from '../components/intake/PinGate';
import AlbumIntakeForm from '../components/intake/AlbumIntakeForm';

export default function IntakePage() {
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Show settings automatically if no token is present
    const hasToken = localStorage.getItem('GITHUB_TOKEN');
    if (!hasToken) {
      setShowSettings(true);
    }
  }, []);

  const handleSettingsSuccess = () => {
    setShowSettings(false);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 relative overflow-hidden">
      {/* Background blobs matching the theme */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto relative z-10 flex flex-col items-center">
        {showSettings ? (
          <PinGate onSuccess={handleSettingsSuccess} />
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-2xl flex justify-end mb-4">
              <button
                onClick={() => setShowSettings(true)}
                className="text-white/50 hover:text-white transition-colors text-sm underline"
              >
                Admin Settings
              </button>
            </div>
            <AlbumIntakeForm />
          </div>
        )}
      </div>
    </div>
  );
}
