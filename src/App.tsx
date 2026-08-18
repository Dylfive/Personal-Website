import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import NicknameModal from './components/NicknameModal';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedLayout from './components/layouts/ProtectedLayout';
import PublicLayout from './components/layouts/PublicLayout';

// ── Lazy-loaded page components for route code-splitting ─────────────────────
const Login = lazy(() => import('./pages/Login'));
const Resume = lazy(() => import('./pages/Resume'));
const OwnerWallPage = lazy(() => import('./pages/OwnerWallPage'));
const UserWallPage = lazy(() => import('./pages/UserWallPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const IntakePage = lazy(() => import('./pages/IntakePage'));
const AddAlbumPage = lazy(() => import('./pages/AddAlbumPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ExperimentPage = lazy(() => import('./pages/ExperimentPage'));

/**
 * Inner component that has access to auth context.
 * Renders the NicknameModal overlay when the user is logged in but has no nickname yet.
 */
function AppShell() {
  const { user, nickname, nicknameLoading, loading } = useAuth();

  // Show nickname modal once auth + nickname state is resolved,
  // user is logged in, and they have no nickname yet.
  const showNicknameModal = !nicknameLoading && !!user && nickname === null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:text-white">
      <Navbar />

      {showNicknameModal && <NicknameModal />}

      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Root redirect — wait for auth to resolve before deciding destination */}
            <Route
              path="/"
              element={loading ? null : <Navigate to={user ? '/dashboard' : '/login'} replace />}
            />

            {/* Standalone full-height public route */}
            <Route path="/login" element={<Login />} />

            {/* Standard public routes with page header offset */}
            <Route element={<PublicLayout />}>
              <Route path="/resume" element={<Resume />} />
              <Route path="/wall" element={<OwnerWallPage />} />
              <Route path="/wall/:userId" element={<UserWallPage />} />
            </Route>

            {/* Protected routes — require Supabase auth */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/intake" element={<IntakePage />} />
              <Route path="/add" element={<AddAlbumPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/experiment" element={<ExperimentPage />} />
            </Route>

            {/* Catch-all → login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <Router basename="/Personal-Website/">
      <AuthProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
