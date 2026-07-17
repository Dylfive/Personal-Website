import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save } from 'lucide-react';

interface PinGateProps {
  onSuccess: () => void;
}

export default function PinGate({ onSuccess }: PinGateProps) {
  const [githubToken, setGithubToken] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  useEffect(() => {
    const storedGithub = localStorage.getItem('GITHUB_TOKEN');
    const storedGemini = localStorage.getItem('GEMINI_API_KEY');
    
    if (storedGithub) setGithubToken(storedGithub);
    if (storedGemini) setGeminiKey(storedGemini);
  }, []);

  const handleSave = () => {
    if (!githubToken.trim()) return; // Required
    localStorage.setItem('GITHUB_TOKEN', githubToken.trim());
    if (geminiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }
    onSuccess();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl neon-border max-w-md w-full"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center">
            <Settings className="w-8 h-8 text-neon-purple" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Admin Settings</h2>
          <p className="text-white/50 text-sm">Provide your API keys to manage the album dataset. Keys are saved securely in your browser's local storage.</p>
        </div>

        <div className="space-y-4 mb-8 text-left">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">GitHub Personal Access Token *</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white transition-all"
              placeholder="ghp_..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Gemini API Key (Optional)</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white transition-all"
              placeholder="AI... (Used for AI genre generation)"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!githubToken.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg bg-neon-purple text-white hover:bg-neon-purple/80 transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          Save & Continue
        </button>
      </motion.div>
    </div>
  );
}
