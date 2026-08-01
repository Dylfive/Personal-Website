import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Navbar from './components/Navbar';
import Resume from './pages/Resume';
import IntakePage from './pages/IntakePage';
import Login from './pages/Login';

function App() {
  return (
    <Router basename="/Personal-Website/">
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground selection:bg-accent-amber/30">
          <Navbar />
          <Routes>
            {/* Root redirect — go to login (AuthGuard on /intake handles the auth-aware redirect) */}
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

            {/* Protected route — requires Supabase auth */}
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

            {/* Catch-all → login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
