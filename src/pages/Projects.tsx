import { motion } from 'framer-motion';
import MusicDashboard from '../components/MusicDashboard';

const Projects = () => {
  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-16"
      >
        <h1 className="text-5xl font-black mb-4">Project <span className="gradient-text">Showcase</span></h1>
        <p className="text-white/60 text-lg">A collection of technical experiments, open-source work, and interactive demos.</p>
      </motion.div>

      {/* Music Dashboard */}
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#bc13fe] mb-2">Music Taste Dashboard</h2>
          <p className="text-white/50 text-sm max-w-2xl">
            A personal Letterboxd for albums — every record I've listened to, rated out of 10, with live data visualizations across genre, era, and listening stats. Built with React, TypeScript, and the iTunes API.
          </p>
        </div>
        <MusicDashboard />
      </div>
    </div>
  );
};

export default Projects;
