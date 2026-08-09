import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemePickerProps {
  /** 'site' = owner changing global theme | 'personal' = user changing their wall/profile accent */
  mode?: 'site' | 'personal';
  /** For personal mode — the currently selected theme id */
  value?: string;
  /** For personal mode — called when user picks a theme */
  onChange?: (themeId: string) => void;
  label?: string;
}

export default function ThemePicker({
  mode = 'site',
  value,
  onChange,
  label,
}: ThemePickerProps) {
  const { themes, siteTheme, setSiteTheme } = useTheme();

  const activeId = mode === 'site' ? siteTheme.id : (value ?? siteTheme.id);

  const handlePick = (themeId: string) => {
    if (mode === 'site') {
      setSiteTheme(themeId);
    } else {
      onChange?.(themeId);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">
          {label ?? (mode === 'site' ? 'Site Theme' : 'Accent Color')}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {themes.map((theme) => {
          const isActive = activeId === theme.id;
          return (
            <motion.button
              key={theme.id}
              onClick={() => handlePick(theme.id)}
              title={theme.label}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className={`relative rounded-xl overflow-hidden h-10 border-2 transition-all duration-200 ${
                isActive
                  ? 'border-white/70 shadow-lg'
                  : 'border-white/10 hover:border-white/30'
              }`}
              style={{
                boxShadow: isActive
                  ? `0 0 12px ${theme.primary}80`
                  : undefined,
              }}
            >
              {/* Gradient swatch */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})`,
                }}
              />
              {/* Active check */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                  >
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Active theme label */}
      <p className="text-[11px] text-white/40 text-center">
        {themes.find(t => t.id === activeId)?.label ?? ''}
      </p>
    </div>
  );
}
