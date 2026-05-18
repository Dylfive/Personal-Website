import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Cpu, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

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
          <span className="text-xs font-mono tracking-widest uppercase text-white/70">Available for Internships 2026</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight">
          Dylan <span className="gradient-text">Gauvin</span>.
        </h1>
        
        <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
          Computer Science student & Technical Business Analyst specializing in 
          <span className="text-neon-blue"> Cloud Automation</span> and 
          <span className="text-neon-purple"> Full Stack Development</span>.
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <Link to="/projects" className="btn-primary group flex items-center gap-2 text-lg">
            View Projects
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/resume" className="px-8 py-3 rounded-full border border-white/20 font-bold hover:bg-white/5 transition-colors flex items-center gap-2">
            Read Resume
          </Link>
        </div>
      </motion.div>
      
      {/* Feature Cards Grid (Quick Look) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 container mx-auto z-10">
        {[
          { icon: <Cpu className="text-neon-purple" />, title: 'Full Stack', desc: 'React, Node.js, TypeScript' },
          { icon: <Rocket className="text-neon-blue" />, title: 'Scalable Apps', desc: 'Microservices & Cloud Architecture' },
          { icon: <Terminal className="text-neon-cyan" />, title: 'Clean Code', desc: 'Obsessed with patterns & efficiency' },
        ].map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="glass-panel p-8 rounded-3xl neon-border"
          >
            <div className="mb-4">{feat.icon}</div>
            <h3 className="text-xl font-bold mb-2">{feat.title}</h3>
            <p className="text-white/50">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Home;
