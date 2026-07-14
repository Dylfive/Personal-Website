import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Code2 } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Resume', path: '/resume' },
    { name: 'Projects', path: '/projects' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-lg border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
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
              className={`relative font-medium transition-colors hover:text-white ${location.pathname === link.path ? 'text-white' : 'text-white/60'}`}
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
          <button
            className="btn-primary text-sm px-6 py-2"
            onClick={() => navigate('/contact')}
          >
            Get in touch
          </button>
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
            <button
              className="btn-primary w-full mt-4"
              onClick={() => { setIsOpen(false); navigate('/contact'); }}
            >
              Get in touch
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
