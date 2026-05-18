import { motion } from 'framer-motion';
import { Coffee, Code, Book, Gamepad2, Heart, Music, Camera, Shield, Zap } from 'lucide-react';

const About = () => {
  const funFacts = [
    { icon: <Shield />, label: "Security", value: "Active participant in CTF competitions and vulnerability research." },
    { icon: <Zap />, label: "Automation", value: "Obsessed with scripting away manual tasks using PowerShell and APIs." },
    { icon: <Code />, label: "Building", value: "Co-founded Matrix Studios to deliver professional web solutions." },
    { icon: <Music />, label: "Focus", value: "Fueling dev sessions with lo-fi and deep techno." },
  ];

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Photo Placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="absolute -inset-4 bg-gradient-to-tr from-neon-purple to-neon-blue rounded-[40px] opacity-20 group-hover:opacity-40 transition-opacity blur-2xl" />
          <div className="relative aspect-[4/5] bg-white/5 rounded-[40px] border border-white/10 overflow-hidden neon-border">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
              <Camera className="w-20 h-20 mb-4" />
              <p className="font-mono text-sm tracking-widest uppercase">Dylan.jpg</p>
            </div>
            <div className="absolute inset-0 shimmer opacity-30" />
          </div>
          
          <div className="absolute -bottom-6 -right-6 glass-panel p-6 rounded-2xl border-white/20 shadow-2xl">
            <p className="text-neon-cyan font-bold flex items-center gap-2">
              <Code className="w-4 h-4" /> CS @ York University
            </p>
          </div>
        </motion.div>

        {/* Bio Text */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl font-black mb-6 tracking-tight">Behind the <span className="gradient-text">Screen</span>.</h1>
            <p className="text-white/60 text-lg leading-relaxed">
              I'm Dylan Gauvin, a Computer Science Honours student at York University with a dual focus on 
              <span className="text-white"> enterprise-level automation</span> and <span className="text-white">creative full-stack development</span>.
            </p>
            <p className="text-white/60 text-lg leading-relaxed mt-6">
              In my role at BCI, I manage Azure tools for over 10,000 users, leveraging PowerShell and the Microsoft Graph API 
              to architect scalable cloud solutions. Meanwhile, as a co-founder of Matrix Studios, I bridge the gap between 
              technical complexity and business goals, building custom digital experiences for industry leaders.
            </p>
            <p className="text-white/60 text-lg leading-relaxed mt-6">
              When I'm not in a terminal, you'll likely find me diving into Cyber Forensics or competing in CTFs, 
              constantly pushing my understanding of system security and software resilience.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-6 pt-8">
            {funFacts.map((fact, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="space-y-2"
              >
                <div className="text-neon-purple w-5 h-5">{fact.icon}</div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">{fact.label}</h4>
                <p className="text-sm text-white/80">{fact.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
