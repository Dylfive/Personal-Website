import { motion } from 'framer-motion';
import { ExternalLink, Code, Play, Layout } from 'lucide-react';
import MusicDashboard from '../components/MusicDashboard';



const ProjectCard = ({ title, desc, tags, icon, index }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="glass-panel p-8 rounded-3xl neon-border group relative flex flex-col h-full"
  >
    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-3">{title}</h3>
    <p className="text-white/50 text-sm leading-relaxed mb-6 flex-grow">{desc}</p>
    <div className="flex flex-wrap gap-2 mb-8">
      {tags.map((tag: string, i: number) => (
        <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider font-bold text-white/60">
          {tag}
        </span>
      ))}
    </div>
    <div className="flex gap-4">
      <button className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors">
        <Code className="w-4 h-4" /> Code
      </button>
      <button className="flex items-center gap-2 text-xs font-bold text-neon-blue hover:text-white transition-colors">
        <ExternalLink className="w-4 h-4" /> Live Demo
      </button>
    </div>
  </motion.div>
);

const Projects = () => {
  const otherProjects = [
    {
      title: "Matrix Studios",
      desc: "Co-founded a digital agency delivering full-stack web solutions. Built and deployed custom WordPress/WooCommerce sites with high-fidelity frontend enhancements.",
      tags: ["WordPress", "WooCommerce", "Custom CSS", "Business Dev"],
      icon: <Layout className="text-neon-magenta w-7 h-7" />
    },
    {
      title: "Flow Design System",
      desc: "A headless component library for building high-performance, accessible enterprise dashboards.",
      tags: ["React", "Storybook", "TypeScript", "Tailwind"],
      icon: <Layout className="text-neon-cyan w-7 h-7" />
    },
    {
      title: "Pulse Crypto",
      desc: "Real-time cryptocurrency arbitrage scanner using WebSockets and automated trading execution.",
      tags: ["Rust", "Redis", "AWS Lambda", "API Gateway"],
      icon: <Play className="text-neon-green w-7 h-7" />
    }
  ];

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
        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#bc13fe] mb-6">Music Taste Dashboard</h2>
        <MusicDashboard />
      </div>

      {/* Grid of other projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
        {otherProjects.map((proj, i) => (
          <ProjectCard key={i} {...proj} index={i} />
        ))}
      </div>
    </div>
  );
};

export default Projects;
