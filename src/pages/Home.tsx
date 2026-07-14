import { motion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

// Inline SVG brand icons (lucide-react v1 doesn't include social icons)
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const Home = () => {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Background Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-white/20 mb-8">
          <Terminal className="w-4 h-4 text-neon-cyan" />
          <span className="text-xs font-mono tracking-widest uppercase text-white/70">Open to New Opportunities</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight">
          Dylan <span className="gradient-text">Gauvin</span>.
        </h1>
        
        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
          Computer Science student specializing in{' '}
          <span className="text-neon-blue">Cloud Automation</span> and{' '}
          <span className="text-neon-purple">Full Stack Development</span>.
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10">
          <Link to="/projects" className="btn-primary group flex items-center gap-2 text-lg">
            View Projects
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/resume" className="px-8 py-3 rounded-full border border-white/20 font-bold hover:bg-white/5 transition-colors flex items-center gap-2">
            Read Resume
          </Link>
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-5">
          <a
            href="https://github.com/Dylfive"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium group"
          >
            <GithubIcon className="w-5 h-5 group-hover:text-neon-purple transition-colors" />
            GitHub
          </a>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <a
            href="https://www.linkedin.com/in/dylan-gauvin/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium group"
          >
            <LinkedinIcon className="w-5 h-5 group-hover:text-neon-blue transition-colors" />
            LinkedIn
          </a>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <Link
            to="/contact"
            className="text-white/50 hover:text-white transition-colors text-sm font-medium"
          >
            Contact
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
