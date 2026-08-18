import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children?: React.ReactNode;
}

/**
 * Wraps a route to require authentication.
 * - Shows a spinner while the session is resolving.
 * - Redirects to /login (preserving intended destination) if unauthenticated.
 * - Renders children or <Outlet /> if authenticated.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
          className="w-8 h-8 border-2 border-white/20 border-t-neon-purple rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children ?? <Outlet />}</>;
}
