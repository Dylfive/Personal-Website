import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import NicknameModal from './components/NicknameModal';
import Navbar from './components/Navbar';
import IntakePage from './pages/IntakePage';
import Login from './pages/Login';
import LeaderboardPage from './pages/LeaderboardPage';
import OwnerWallPage from './pages/OwnerWallPage';
import ExperimentPage from './pages/ExperimentPage';
import Resume from './pages/Resume';
import { useAuth } from './contexts/AuthContext';

/**
 * Inner component that has access to auth context.
 * Renders the NicknameModal overlay when the user is logged in but has no nickname yet.
 */
function AppShell() {
  const { user, nickname, nicknameLoading } = useAuth();

  // Show nickname modal once auth + nickname state is resolved,
  // user is logged in, and they have no nickname yet.
  const showNicknameModal = !nicknameLoading && !!user && nickname === null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent-amber/30">
      <Navbar />

      {showNicknameModal && <NicknameModal />}

      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/resume"
          element={
            <main className="pt-20">
              <Resume />
            </main>
          }
        />

        {/* Dylan's Wall — fully public, no login required */}
        <Route
          path="/wall"
          element={
            <main className="pt-20">
              <OwnerWallPage />
            </main>
          }
        />

        {/* Protected routes — require Supabase auth */}
        <Route
          path="/intake"
          element={
            <AuthGuard>
              <main className="pt-20">
                <IntakePage />
              </main>
            </AuthGuard>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <AuthGuard>
              <main className="pt-20">
                <LeaderboardPage />
              </main>
            </AuthGuard>
          }
        />
        <Route
          path="/experiment"
          element={
            <AuthGuard>
              <main className="pt-20">
                <ExperimentPage />
              </main>
            </AuthGuard>
          }
        />

        {/* Catch-all → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router basename="/Personal-Website/">
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
