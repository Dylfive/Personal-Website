import { useRef } from 'react';
import {
  Palette,
  Frame,
  Sun,
  Grid,
  Sparkles,
  Rows3,
  RotateCcw,
  Trash2,
  Upload,
  Eye,
  Magnet,
} from 'lucide-react';
import type {
  WallBackgroundConfig,
  WallCustomizationConfig,
  BackgroundPreset,
  FrameStyle,
  LightingMode,
  ShadowDepth,
  BinTheme,
} from '../../types/wallStudio';

interface CustomizationDrawerProps {
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
  onChangeBackground: (patch: Partial<WallBackgroundConfig>) => void;
  onChangeCustomization: (patch: Partial<WallCustomizationConfig>) => void;
  onApplyLayout: (layout: 'grid' | 'scatter' | 'shelf') => void;
  onClearWall: () => void;
  onResetWall: () => void;
}

const CUSTOM_GRADIENTS = [
  { label: 'Midnight', value: 'linear-gradient(135deg, #1a1025 0%, #0d1b2a 50%, #1b263b 100%)' },
  { label: 'Sunset', value: 'linear-gradient(135deg, #4a154b 0%, #9b2c2c 50%, #dd6b20 100%)' },
  { label: 'Sage', value: 'linear-gradient(135deg, #132a13 0%, #31572c 50%, #4f772d 100%)' },
  { label: 'Velvet', value: 'linear-gradient(135deg, #2b091c 0%, #5c1638 50%, #1b0b28 100%)' },
  { label: 'Cyber', value: 'linear-gradient(135deg, #0f172a 0%, #312e81 50%, #06b6d4 100%)' },
];

const FRAME_OPTIONS: { id: FrameStyle; label: string }[] = [
  { id: 'bare', label: 'Bare Sleeve' },
  { id: 'matte', label: 'Matte Frame' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'vinyl-peek', label: 'Vinyl Peek' },
  { id: 'tape', label: 'Masking Tape' },
  { id: 'pushpin', label: 'Pushpin' },
];

const BIN_THEMES: { id: BinTheme; label: string; swatch: string }[] = [
  { id: 'cupid-pink', label: 'Cupid Pink', swatch: '#ff8fab' },
  { id: 'sky-blue', label: 'Sky Blue', swatch: '#7cc6fe' },
  { id: 'cream-arcade', label: 'Cream Arcade', swatch: '#f6d365' },
  { id: 'dark-lofi', label: 'Dark Lo-Fi', swatch: '#a78bfa' },
];

export default function CustomizationDrawer({
  background,
  customization,
  onChangeBackground,
  onChangeCustomization,
  onApplyLayout,
  onClearWall,
  onResetWall,
}: CustomizationDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeBackground({
          preset: 'custom',
          customType: 'image',
          customValue: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-5">
      {/* ── Section 1: Wall Background ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Palette className="w-4 h-4 text-[color:var(--accent-primary)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 font-sans">
            Wall Surface
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(['wood', 'cork', 'marble', 'custom'] as BackgroundPreset[]).map((preset) => {
            const active = background.preset === preset;
            return (
              <button
                key={preset}
                onClick={() => onChangeBackground({ preset })}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                  active
                    ? 'border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)]/20 text-white shadow-sm'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        {/* Sub-options per background */}
        {background.preset === 'wood' && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] text-white/45">Tone:</span>
            {(['walnut', 'oak', 'birch'] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => onChangeBackground({ woodTone: tone })}
                className={`px-2.5 py-1 rounded-lg text-[11px] capitalize border transition-all ${
                  (background.woodTone ?? 'walnut') === tone
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                    : 'border-white/10 text-white/50 hover:text-white'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        )}

        {background.preset === 'marble' && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] text-white/45">Stone:</span>
            {(['carrara', 'nero', 'emerald'] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => onChangeBackground({ marbleTone: tone })}
                className={`px-2.5 py-1 rounded-lg text-[11px] capitalize border transition-all ${
                  (background.marbleTone ?? 'carrara') === tone
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/10 text-white/50 hover:text-white'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        )}

        {background.preset === 'custom' && (
          <div className="mt-3 space-y-2.5 p-3 rounded-xl bg-black/30 border border-white/10">
            <div className="flex gap-1.5">
              {(['color', 'gradient', 'image'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onChangeBackground({ customType: t })}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                    background.customType === t
                      ? 'bg-white/15 text-white'
                      : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {background.customType === 'color' && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={background.customValue.startsWith('#') ? background.customValue : '#1e1b4b'}
                  onChange={(e) => onChangeBackground({ customValue: e.target.value })}
                  className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={background.customValue}
                  onChange={(e) => onChangeBackground({ customValue: e.target.value })}
                  placeholder="#1e1b4b"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>
            )}

            {background.customType === 'gradient' && (
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_GRADIENTS.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => onChangeBackground({ customValue: g.value })}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white border border-white/15 hover:scale-105 transition-transform"
                    style={{ background: g.value }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            {background.customType === 'image' && (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={background.customValue.startsWith('data:') ? '' : background.customValue}
                    onChange={(e) => onChangeBackground({ customValue: e.target.value })}
                    placeholder="Paste image URL..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1"
                    title="Upload image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {background.preset !== 'custom' && (
          <div className="mt-2.5 flex items-center gap-3">
            <span className="text-[11px] text-white/45 whitespace-nowrap">Texture</span>
            <input
              type="range"
              min={15}
              max={100}
              value={background.textureIntensity}
              onChange={(e) => onChangeBackground({ textureIntensity: Number(e.target.value) })}
              className="w-full accent-[color:var(--accent-primary)] h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* ── Section 2: Frame & Mount Style ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Frame className="w-4 h-4 text-[color:var(--accent-secondary)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 font-sans">
            Album Mount & Frame
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {FRAME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChangeCustomization({ globalFrame: opt.id })}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                customization.globalFrame === opt.id
                  ? 'border-[color:var(--accent-secondary)] bg-[color:var(--accent-secondary)]/20 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/55 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 3: Lighting & Shadows ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Sun className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 font-sans">
            Lighting & Depth
          </h3>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {(['none', 'warm', 'cool', 'spotlight'] as LightingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeBackground({ lighting: mode })}
              className={`px-2 py-1.5 rounded-lg text-[11px] capitalize border transition-all ${
                background.lighting === mode
                  ? 'border-amber-400/60 bg-amber-400/15 text-amber-200'
                  : 'border-white/10 text-white/55 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/45">Shadows:</span>
          <div className="flex gap-1.5">
            {(['none', 'soft', 'deep'] as ShadowDepth[]).map((depth) => (
              <button
                key={depth}
                onClick={() => onChangeCustomization({ shadowDepth: depth })}
                className={`px-2.5 py-1 rounded-lg text-[11px] capitalize border transition-all ${
                  customization.shadowDepth === depth
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/10 text-white/45 hover:text-white'
                }`}
              >
                {depth}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 4: Display & Snapping Toggles ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4 text-white/60" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 font-sans">
            Display Options
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              key: 'showRatings' as const,
              label: 'Ratings',
              val: customization.showRatings,
            },
            {
              key: 'showTitles' as const,
              label: 'Titles',
              val: customization.showTitles,
            },
            {
              key: 'snapToGrid' as const,
              label: 'Snap Grid',
              val: customization.snapToGrid,
              icon: <Magnet className="w-3 h-3" />,
            },
            {
              key: 'showWallTrim' as const,
              label: 'Wall Trim',
              val: customization.showWallTrim,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => onChangeCustomization({ [item.key]: !item.val })}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                item.val
                  ? 'border-[color:var(--accent-primary)]/50 bg-[color:var(--accent-primary)]/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/45'
              }`}
            >
              <span className="flex items-center gap-1">
                {item.icon}
                {item.label}
              </span>
              <span className="text-[10px] font-bold">{item.val ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onChangeBackground({ vignette: !background.vignette })}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
            background.vignette
              ? 'border-white/30 bg-white/10 text-white'
              : 'border-white/10 bg-white/[0.02] text-white/45'
          }`}
        >
          <span>Vignette Edge</span>
          <span className="text-[10px] font-bold">{background.vignette ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* ── Section 5: Pixel Bin Palette ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80 font-sans">
            3D Bin Palette
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {BIN_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeCustomization({ binTheme: t.id })}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                customization.binTheme === t.id
                  ? 'border-white/50 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/55 hover:text-white'
              }`}
            >
              <span
                className="w-3 h-3 rounded-sm border border-black/40 flex-shrink-0"
                style={{ backgroundColor: t.swatch }}
              />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 6: Quick Layouts & Reset ── */}
      <div className="pt-2 border-t border-white/10 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onApplyLayout('grid')}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80"
          >
            <Grid className="w-3 h-3" /> Grid
          </button>
          <button
            onClick={() => onApplyLayout('scatter')}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80"
          >
            <Sparkles className="w-3 h-3" /> Scatter
          </button>
          <button
            onClick={() => onApplyLayout('shelf')}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80"
          >
            <Rows3 className="w-3 h-3" /> Shelves
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onResetWall}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/65 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" /> Reset Default
          </button>
          <button
            onClick={onClearWall}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-[11px] text-red-300"
          >
            <Trash2 className="w-3 h-3" /> Clear Wall
          </button>
        </div>
      </div>
    </div>
  );
}
