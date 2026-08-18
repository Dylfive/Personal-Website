import { Outlet } from 'react-router-dom';
import AuthGuard from '../AuthGuard';

/**
 * Layout route wrapper for protected pages.
 * Enforces authentication and provides standard page padding.
 */
export default function ProtectedLayout() {
  return (
    <AuthGuard>
      <main className="pt-20">
        <Outlet />
      </main>
    </AuthGuard>
  );
}
