import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Code2, LogOut, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Resume', path: '/resume' },
    { name: 'Projects', path: '/projects' },
    { name: 'About', path: '/about' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
  };

  // First letter of email for the avatar
  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-lg border-b border-white/10 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(188,19,254,0.6)] transition-all">
            <Code2 className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">Dylan Gauvin</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative font-medium transition-colors hover:text-white ${
                location.pathname === link.path ? 'text-white' : 'text-white/60'
              }`}
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-purple to-neon-blue"
                />
              )}
            </Link>
          ))}

          {user ? (
            // ── Authenticated: show intake link + user chip + sign out ──
            <div className="flex items-center gap-3">
              <Link
                to="/intake"
                className={`relative font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                  location.pathname === '/intake' ? 'text-white' : 'text-white/60'
                }`}
              >
                <Music className="w-4 h-4" />
                Intake
                {location.pathname === '/intake' && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-purple to-neon-blue"
                  />
                )}
              </Link>

              {/* User avatar chip */}
              <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                <div
                  title={user.email}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white text-sm font-bold shadow-[0_0_12px_rgba(188,19,254,0.4)]"
                >
                  {avatarLetter}
                </div>
                <button
                  id="sign-out-btn"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="text-white/40 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // ── Unauthenticated: original CTA ──
            <Link to="/contact">
              <button className="btn-primary text-sm px-6 py-2">Get in touch</button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col gap-4"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-lg font-medium text-white/80 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  to="/intake"
                  className="text-lg font-medium text-white/80 hover:text-white flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <Music className="w-5 h-5" /> Intake
                </Link>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
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
              <Link to="/contact" onClick={() => setIsOpen(false)}>
                <button className="btn-primary w-full mt-4">Get in touch</button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
