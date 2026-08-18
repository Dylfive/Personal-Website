import { Outlet } from 'react-router-dom';

/**
 * Layout route wrapper for public pages with standard page header offset.
 */
export default function PublicLayout() {
  return (
    <main className="pt-20">
      <Outlet />
    </main>
  );
}
