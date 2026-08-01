import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Disc3, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? '?';
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || isOpen
          ? 'bg-background/80 backdrop-blur-xl border-b border-white/[0.06] py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* ── Logo ── */}
        <Link
          to={user ? '/intake' : '/login'}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-accent-amber/30 bg-accent-amber/10 group-hover:bg-accent-amber/20 group-hover:border-accent-amber/50 transition-all duration-300">
            <Disc3 className="w-5 h-5 text-accent-amber" />
          </div>
          <span
            className="text-lg font-serif font-bold tracking-tight text-white group-hover:text-accent-amber transition-colors duration-300"
          >
            AlbumWall
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <div className="hidden md:flex items-center gap-6">
          {/* Resume — always visible */}
          <Link
            to="/resume"
            className={`text-sm font-medium transition-colors hover:text-white ${
              location.pathname === '/resume' ? 'text-white' : 'text-white/50'
            }`}
          >
            Resume
          </Link>

          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
              {/* My Collection link */}
              <Link
                to="/intake"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white ${
                  location.pathname === '/intake' ? 'text-accent-amber' : 'text-white/50'
                }`}
              >
                <Music className="w-4 h-4" />
                My Collection
              </Link>

              {/* User chip */}
              <div className="flex items-center gap-2">
                <div
                  title={user.email}
                  className="w-8 h-8 rounded-full border border-accent-amber/40 bg-accent-amber/15 flex items-center justify-center text-accent-amber text-sm font-bold"
                >
                  {avatarLetter}
                </div>
                <button
                  id="sign-out-btn"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="text-white/30 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            !isLoginPage && (
              <Link to="/login">
                <button className="text-sm font-medium px-5 py-2 rounded-full border border-accent-amber/40 text-accent-amber hover:bg-accent-amber/10 transition-all duration-200">
                  Sign In
                </button>
              </Link>
            )
          )}
        </div>

        {/* ── Mobile Toggle ── */}
        <button
          className="md:hidden text-white/60 hover:text-white transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile Nav ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-white/[0.06] p-6 flex flex-col gap-5"
          >
            <Link
              to="/resume"
              className="text-base font-medium text-white/70 hover:text-white transition-colors"
            >
              Resume
            </Link>

            {user ? (
              <>
                <Link
                  to="/intake"
                  className="flex items-center gap-2 text-base font-medium text-white/70 hover:text-accent-amber transition-colors"
                >
                  <Music className="w-5 h-5" /> My Collection
                </Link>
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-white/40 text-sm truncate max-w-[200px]">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 text-red-400 text-sm font-medium hover:text-red-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </>
            ) : (
              !isLoginPage && (
                <Link to="/login" className="inline-block">
                  <button className="text-sm font-medium px-5 py-2.5 rounded-full border border-accent-amber/40 text-accent-amber hover:bg-accent-amber/10 transition-all">
                    Sign In
                  </button>
                </Link>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
