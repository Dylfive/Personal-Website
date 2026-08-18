import { motion } from 'framer-motion';

export default function LoadingFallback() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Ambient subtle glow */}
        <div className="absolute w-16 h-16 rounded-full bg-accent-amber/20 blur-xl animate-pulse" />
        
        {/* Dual ring spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1.2 }}
          className="w-10 h-10 rounded-full border-2 border-white/10 border-t-accent-amber border-r-accent-amber2"
        />
      </div>
      <p className="text-white/30 text-xs font-mono tracking-wider uppercase">Loading...</p>
    </div>
  );
}
