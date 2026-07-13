import { useState, useEffect } from 'react';
import PinGate from '../components/intake/PinGate';
import AlbumIntakeForm from '../components/intake/AlbumIntakeForm';

export default function IntakePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check session storage on mount
    const authStatus = sessionStorage.getItem('intake_auth');
    if (authStatus === '1') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = () => {
    sessionStorage.setItem('intake_auth', '1');
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-12 relative overflow-hidden">
      {/* Background blobs matching the theme */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto relative z-10 flex flex-col items-center">
        {!isAuthenticated ? (
          <PinGate onSuccess={handleAuthSuccess} />
        ) : (
          <AlbumIntakeForm />
        )}
      </div>
    </div>
  );
}
