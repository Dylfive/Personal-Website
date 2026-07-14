import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, GraduationCap, ChevronDown, Award, Globe, Code, Rocket, Cloud, Terminal } from 'lucide-react';

const ExperienceCard = ({ company, role, period, details, index }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-panel rounded-2xl overflow-hidden neon-border mb-6 cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-6 flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <Briefcase className="text-neon-blue w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{role}</h3>
            <p className="text-neon-purple font-medium">{company}</p>
            <p className="text-white/40 text-sm mt-1">{period}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-white/40"
        >
          <ChevronDown />
        </motion.div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            <div className="h-px bg-white/10 mb-6" />
            <ul className="space-y-3">
              {details.map((detail: string, i: number) => (
                <li key={i} className="text-white/60 flex gap-3 text-sm leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-1.5 shrink-0" />
                  {detail}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Resume = () => {
  const experiences = [
    {
      company: "BCI",
      role: "Technical Business Analyst (Co-op)",
      period: "May 2024 – January 2026",
      details: [
        "Administered Azure enterprise-level tools for 10,000+ users, ensuring high availability and security.",
        "Architected and deployed an automated email management system using Microsoft Graph API, eliminating thousands of manual operations per month across the enterprise.",
        "Optimized complex project workflows through seamless REST API integrations with SharePoint, Jira, and ServiceNow, reducing cross-team overhead significantly.",
      ]
    },
    {
      company: "Matrix Studios",
      role: "Co-founder / Lead Developer",
      period: "September 2023 – Present",
      details: [
        "Designed and deployed professional websites tailored for the beauty and skin industry, including ehehair.com.",
        "Collaborated directly with business owners to translate aesthetic visions into custom digital solutions.",
        "Managed full-stack development cycles using WordPress, WooCommerce, and custom CSS enhancements.",
      ]
    },
    {
      company: "Global Nexus",
      role: "Junior Software Engineer",
      period: "June 2023 – August 2023",
      details: [
        "Contributed to a robust Ruby on Rails codebase for a web-based e-learning platform.",
        "Drafted and managed comprehensive technical documentation using Jekyll.",
        "Participated in daily stand-ups and agile workflows to deliver features on tight deadlines.",
      ]
    }
  ];

  const skills = [
    { category: "Cloud & Automation", items: ["Azure", "PowerShell", "Microsoft Graph API", "REST API"], color: "neon-blue", icon: <Cloud className="w-4 h-4" /> },
    { category: "Full Stack", items: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion", "Node.js", "WordPress", "WooCommerce", "Ruby on Rails", "JavaScript", "Python", "SQL", "C++"], color: "neon-purple", icon: <Code className="w-4 h-4" /> },
    { category: "Tools & Systems", items: ["SharePoint", "Jira", "ServiceNow", "Jekyll", "Linux", "Git", "Bash"], color: "neon-cyan", icon: <Terminal className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-16 flex flex-col md:flex-row justify-between items-end gap-6"
      >
        <div>
          <h1 className="text-5xl font-black mb-4">Interactive <span className="gradient-text">Resume</span></h1>
        </div>
        <a 
          href={`${import.meta.env.BASE_URL}Dylan-Gauvin-Resume.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-full border border-neon-blue/50 text-neon-blue font-bold hover:bg-neon-blue/10 transition-all text-sm"
        >
          Download PDF
        </a>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Experience */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <Briefcase className="text-neon-purple" />
            <h2 className="text-2xl font-bold">Experience</h2>
          </div>
          {experiences.map((exp, i) => (
            <ExperienceCard key={i} {...exp} index={i} />
          ))}

          <div className="flex items-center gap-3 mb-8 mt-16">
            <GraduationCap className="text-neon-blue" />
            <h2 className="text-2xl font-bold">Education</h2>
          </div>
          <div className="glass-panel p-8 rounded-3xl neon-border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">B.Sc. Computer Science Honours</h3>
                <p className="text-neon-purple font-medium">York University</p>
              </div>
              <span className="text-white/40 text-sm">2022 – 2027</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">Algorithm Design</span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">Software Engineering</span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">Cyber Forensics</span>
            </div>
          </div>
        </div>

        {/* Right Column: Skills & Interests */}
        <div className="space-y-12">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Code className="text-neon-cyan" />
              <h2 className="text-2xl font-bold">Technical Skills</h2>
            </div>
            <div className="space-y-6">
              {skills.map((skillGroup, i) => (
                <div key={i} className="glass-panel p-6 rounded-2xl border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-${skillGroup.color}`}>{skillGroup.icon}</span>
                    <h3 className={`text-sm font-bold uppercase tracking-widest text-${skillGroup.color}`}>{skillGroup.category}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill, j) => (
                      <span key={j} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:border-white/30 transition-colors">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-8">
              <Award className="text-neon-magenta" />
              <h2 className="text-2xl font-bold">Certifications</h2>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-4">
              <div className="flex gap-3 items-center">
                <Rocket className="text-neon-purple w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Azure Fundamentals</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Completed</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-8">
              <Globe className="text-neon-green" />
              <h2 className="text-2xl font-bold">Interests</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {["CTF Competitions", "AI Security", "Cyber Forensics", "Vulnerability Research"].map((interest, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-neon-green/5 border border-neon-green/20 text-xs text-neon-green/80">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resume;
