import { motion } from 'framer-motion';
import { Mail, FileText, ArrowUpRight } from 'lucide-react';

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

const contactLinks = [
  {
    icon: <Mail className="w-6 h-6" />,
    label: 'Email',
    value: 'dylangauvin@me.com',
    href: 'mailto:dylangauvin@me.com',
    color: 'neon-cyan',
  },
  {
    icon: <LinkedinIcon className="w-6 h-6" />,
    label: 'LinkedIn',
    value: 'linkedin.com/in/dylan-gauvin',
    href: 'https://www.linkedin.com/in/dylan-gauvin/',
    color: 'neon-blue',
  },
  {
    icon: <GithubIcon className="w-6 h-6" />,
    label: 'GitHub',
    value: 'github.com/Dylfive',
    href: 'https://github.com/Dylfive',
    color: 'neon-purple',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    label: 'Resume',
    value: 'Download PDF',
    href: `${import.meta.env.BASE_URL}Dylan-Gauvin-Resume.pdf`,
    color: 'neon-magenta',
    download: true,
  },
];

const Contact = () => {
  return (
    <div className="container mx-auto px-6 py-12 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h1 className="text-5xl font-black mb-4">
          Get in <span className="gradient-text">Touch</span>.
        </h1>
      </motion.div>

      <div className="flex flex-col gap-4">
        {contactLinks.map((link, i) => (
          <motion.a
            key={link.label}
            href={link.href}
            target={link.download ? '_blank' : '_blank'}
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="glass-panel p-6 rounded-2xl neon-border group flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-${link.color} group-hover:scale-110 transition-transform`}>
                {link.icon}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-0.5">{link.label}</p>
                <p className="text-base font-semibold text-white">{link.value}</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </motion.a>
        ))}
      </div>
    </div>
  );
};

export default Contact;
