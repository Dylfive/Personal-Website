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
  Sticker,
} from 'lucide-react';
import type {
  WallBackgroundConfig,
  WallCustomizationConfig,
  BackgroundPreset,
  FrameStyle,
  LightingMode,
  ShadowDepth,
  BinTheme,
  PixelStickerKind,
} from '../../types/wallStudio';
import { createStarterPixelGrid } from '../../lib/wallStudioStore';
import type { PixelThemeTokens } from './pixelTheme';
import { pixelShadow } from './pixelTheme';
import PixelTileEditor from './PixelTileEditor';
import { PixelStickerSprite } from './PixelStickerItem';

interface CustomizationDrawerProps {
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
  theme: PixelThemeTokens;
  onChangeBackground: (patch: Partial<WallBackgroundConfig>) => void;
  onChangeCustomization: (patch: Partial<WallCustomizationConfig>) => void;
  onAddSticker: (kind: PixelStickerKind) => void;
  onApplyLayout: (layout: 'grid' | 'scatter' | 'shelf') => void;
  onClearWall: () => void;
  onResetWall: () => void;
}

const CUSTOM_GRADIENTS = [
  { label: 'Midnight', value: 'linear-gradient(135deg, #1a1025 0%, #0d1b2a 50%, #1b263b 100%)' },
  { label: 'Sunset', value: 'linear-gradient(135deg, #4a154b 0%, #9b2c2c 50%, #dd6b20 100%)' },
  { label: 'Sage', value: 'linear-gradient(135deg, #132a13 0%, #31572c 50%, #4f772d 100%)' },
  { label: 'Velvet', value: 'linear-gradient(135deg, #2b091c 0%, #5c1638 50%, #1b0b28 100%)' },
];

const FRAME_OPTIONS: { id: FrameStyle; label: string }[] = [
  { id: 'bare', label: 'Bare' },
  { id: 'matte', label: 'Matte' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'vinyl-peek', label: 'Vinyl' },
  { id: 'tape', label: 'Tape' },
  { id: 'pushpin', label: 'Pin' },
];

const BIN_THEMES: { id: BinTheme; label: string; swatch: string }[] = [
  { id: 'site-theme', label: 'Site Theme', swatch: 'var(--accent-primary)' },
  { id: 'cupid-pink', label: 'Cupid Pink', swatch: '#ff8fab' },
  { id: 'sky-blue', label: 'Sky Blue', swatch: '#7cc6fe' },
  { id: 'cream-arcade', label: 'Arcade', swatch: '#f6d365' },
  { id: 'dark-lofi', label: 'Lavender', swatch: '#a78bfa' },
  { id: 'gameboy-mint', label: 'GB Mint', swatch: '#9bbc0f' },
  { id: 'neon-cyber', label: 'Neon Cyber', swatch: '#f72585' },
  { id: 'sunset-peach', label: 'Peach', swatch: '#f4845f' },
];

const STICKER_KINDS: PixelStickerKind[] = [
  'star',
  'heart',
  'note',
  'sparkle',
  'cassette',
  'crown',
  'plant',
  'moon',
];

export default function CustomizationDrawer({
  background,
  customization,
  theme,
  onChangeBackground,
  onChangeCustomization,
  onAddSticker,
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

  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '10px',
    color: theme.textMain,
  };

  return (
    <div
      className="p-4 space-y-5"
      style={{
        backgroundColor: theme.shellBg,
        border: `4px solid ${theme.shellBorder}`,
        boxShadow: pixelShadow(theme.shellBorder, 6),
        color: theme.textMain,
      }}
    >
      {/* ── Section 1: Wall Surface ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Palette className="w-4 h-4" style={{ color: theme.accent }} />
          <h3 style={sectionHeaderStyle}>WALL SURFACE</h3>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(['wood', 'cork', 'marble', 'custom'] as BackgroundPreset[]).map((preset) => {
            const active = background.preset === preset;
            return (
              <button
                key={preset}
                onClick={() => onChangeBackground({ preset })}
                className="px-1.5 py-1.5 text-sm uppercase cursor-pointer transition-transform active:translate-y-0.5"
                style={{
                  fontFamily: '"VT323", monospace',
                  backgroundColor: active ? theme.accent : theme.btnBg,
                  color: active ? theme.accentText : theme.textMain,
                  border: `2px solid ${theme.shellBorder}`,
                  boxShadow: active ? pixelShadow(theme.shellBorder, 2) : 'none',
                }}
              >
                {preset}
              </button>
            );
          })}
        </div>

        {background.preset === 'wood' && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm" style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}>
              TONE:
            </span>
            {(['walnut', 'oak', 'birch'] as const).map((tone) => {
              const active = (background.woodTone ?? 'walnut') === tone;
              return (
                <button
                  key={tone}
                  onClick={() => onChangeBackground({ woodTone: tone })}
                  className="px-2 py-0.5 text-sm uppercase cursor-pointer"
                  style={{
                    fontFamily: '"VT323", monospace',
                    backgroundColor: active ? theme.accent : theme.badgeBg,
                    color: active ? theme.accentText : theme.textMain,
                    border: `2px solid ${theme.shellBorder}`,
                  }}
                >
                  {tone}
                </button>
              );
            })}
          </div>
        )}

        {background.preset === 'marble' && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm" style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}>
              STONE:
            </span>
            {(['carrara', 'nero', 'emerald'] as const).map((tone) => {
              const active = (background.marbleTone ?? 'carrara') === tone;
              return (
                <button
                  key={tone}
                  onClick={() => onChangeBackground({ marbleTone: tone })}
                  className="px-2 py-0.5 text-sm uppercase cursor-pointer"
                  style={{
                    fontFamily: '"VT323", monospace',
                    backgroundColor: active ? theme.accent : theme.badgeBg,
                    color: active ? theme.accentText : theme.textMain,
                    border: `2px solid ${theme.shellBorder}`,
                  }}
                >
                  {tone}
                </button>
              );
            })}
          </div>
        )}

        {background.preset === 'custom' && (
          <div
            className="mt-2.5 space-y-2.5 p-2.5"
            style={{
              backgroundColor: theme.badgeBg,
              border: `3px solid ${theme.shellBorder}`,
            }}
          >
            <div className="grid grid-cols-4 gap-1">
              {([
                { id: 'pixel-art', label: 'PIXEL' },
                { id: 'color', label: 'COLOR' },
                { id: 'gradient', label: 'GRAD' },
                { id: 'image', label: 'IMG' },
              ] as const).map((t) => {
                const active = background.customType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChangeBackground({ customType: t.id })}
                    className="py-1 text-xs font-bold cursor-pointer"
                    style={{
                      fontFamily: '"VT323", monospace',
                      backgroundColor: active ? theme.accent : theme.shellBg,
                      color: active ? theme.accentText : theme.textMain,
                      border: `2px solid ${theme.shellBorder}`,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {background.customType === 'pixel-art' && (
              <PixelTileEditor
                grid={background.customPixelGrid ?? createStarterPixelGrid('stars')}
                tileSize={background.pixelTileSize ?? 96}
                theme={theme}
                onChangeGrid={(nextGrid) => onChangeBackground({ customPixelGrid: nextGrid })}
                onChangeTileSize={(size) => onChangeBackground({ pixelTileSize: size })}
              />
            )}

            {background.customType === 'color' && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={background.customValue.startsWith('#') ? background.customValue : '#1e1b4b'}
                  onChange={(e) => onChangeBackground({ customValue: e.target.value })}
                  className="w-8 h-8 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={background.customValue}
                  onChange={(e) => onChangeBackground({ customValue: e.target.value })}
                  placeholder="#1e1b4b"
                  className="flex-1 px-2 py-1 text-sm focus:outline-none"
                  style={{
                    fontFamily: '"VT323", monospace',
                    backgroundColor: theme.shellBg,
                    border: `2px solid ${theme.shellBorder}`,
                    color: theme.textMain,
                  }}
                />
              </div>
            )}

            {background.customType === 'gradient' && (
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_GRADIENTS.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => onChangeBackground({ customValue: g.value })}
                    className="px-2 py-1 text-xs font-bold text-white cursor-pointer"
                    style={{
                      background: g.value,
                      border: `2px solid ${theme.shellBorder}`,
                      fontFamily: '"VT323", monospace',
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            {background.customType === 'image' && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={background.customValue.startsWith('data:') ? '' : background.customValue}
                  onChange={(e) => onChangeBackground({ customValue: e.target.value })}
                  placeholder="Paste image URL..."
                  className="flex-1 px-2 py-1 text-sm focus:outline-none"
                  style={{
                    fontFamily: '"VT323", monospace',
                    backgroundColor: theme.shellBg,
                    border: `2px solid ${theme.shellBorder}`,
                    color: theme.textMain,
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 cursor-pointer"
                  style={{
                    backgroundColor: theme.btnBg,
                    border: `2px solid ${theme.shellBorder}`,
                    color: theme.textMain,
                  }}
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
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Pixel Stickers ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sticker className="w-4 h-4" style={{ color: theme.accent }} />
          <h3 style={sectionHeaderStyle}>PIXEL STICKERS</h3>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {STICKER_KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => onAddSticker(kind)}
              title={`Add ${kind} sticker`}
              className="flex items-center justify-center p-1.5 cursor-pointer transition-transform active:translate-y-0.5 hover:scale-105"
              style={{
                backgroundColor: theme.badgeBg,
                border: `2px solid ${theme.shellBorder}`,
                boxShadow: pixelShadow(theme.shellBorder, 2),
              }}
            >
              <PixelStickerSprite kind={kind} size={24} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 3: Album Frame ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Frame className="w-4 h-4" style={{ color: theme.accent }} />
          <h3 style={sectionHeaderStyle}>ALBUM FRAME</h3>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {FRAME_OPTIONS.map((opt) => {
            const active = customization.globalFrame === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChangeCustomization({ globalFrame: opt.id })}
                className="px-2 py-1 text-sm uppercase cursor-pointer"
                style={{
                  fontFamily: '"VT323", monospace',
                  backgroundColor: active ? theme.accent : theme.btnBg,
                  color: active ? theme.accentText : theme.textMain,
                  border: `2px solid ${theme.shellBorder}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 4: Lighting, Shadows & CRT ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sun className="w-4 h-4" style={{ color: theme.starColor }} />
          <h3 style={sectionHeaderStyle}>AMBIANCE</h3>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {(['none', 'warm', 'cool', 'spotlight'] as LightingMode[]).map((mode) => {
            const active = background.lighting === mode;
            return (
              <button
                key={mode}
                onClick={() => onChangeBackground({ lighting: mode })}
                className="px-1.5 py-1 text-sm uppercase cursor-pointer"
                style={{
                  fontFamily: '"VT323", monospace',
                  backgroundColor: active ? theme.accent : theme.badgeBg,
                  color: active ? theme.accentText : theme.textMain,
                  border: `2px solid ${theme.shellBorder}`,
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm" style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}>
            SHADOW:
          </span>
          <div className="flex gap-1">
            {(['none', 'soft', 'deep'] as ShadowDepth[]).map((depth) => {
              const active = customization.shadowDepth === depth;
              return (
                <button
                  key={depth}
                  onClick={() => onChangeCustomization({ shadowDepth: depth })}
                  className="px-2 py-0.5 text-sm uppercase cursor-pointer"
                  style={{
                    fontFamily: '"VT323", monospace',
                    backgroundColor: active ? theme.accent : theme.badgeBg,
                    color: active ? theme.accentText : theme.textMain,
                    border: `2px solid ${theme.shellBorder}`,
                  }}
                >
                  {depth}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 5: Display Toggles ── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4" style={{ color: theme.accent }} />
          <h3 style={sectionHeaderStyle}>DISPLAY</h3>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'showRatings' as const, label: 'RATINGS', val: customization.showRatings },
            { key: 'showTitles' as const, label: 'TITLES', val: customization.showTitles },
            { key: 'snapToGrid' as const, label: 'GRID', val: customization.snapToGrid, icon: <Magnet className="w-3 h-3" /> },
            { key: 'showWallTrim' as const, label: 'TRIM', val: customization.showWallTrim },
            { key: 'pixelateAlbums' as const, label: 'PIXEL ART', val: !!customization.pixelateAlbums, icon: <Sparkles className="w-3 h-3" /> },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => onChangeCustomization({ [item.key]: !item.val })}
              className="flex items-center justify-between px-2 py-1 text-sm cursor-pointer"
              style={{
                fontFamily: '"VT323", monospace',
                backgroundColor: item.val ? theme.accent : theme.badgeBg,
                color: item.val ? theme.accentText : theme.textMain,
                border: `2px solid ${theme.shellBorder}`,
              }}
            >
              <span className="flex items-center gap-1">
                {item.icon}
                {item.label}
              </span>
              <span>{item.val ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>

        {/* Pixel Art Filter Strength Slider */}
        {customization.pixelateAlbums && (
          <div
            className="p-2 space-y-1"
            style={{
              backgroundColor: theme.badgeBg,
              border: `2px solid ${theme.shellBorder}`,
            }}
          >
            <div
              className="flex items-center justify-between text-xs"
              style={{ fontFamily: '"VT323", monospace', color: theme.textMain }}
            >
              <span>PIXEL STRENGTH</span>
              <span>{customization.pixelateStrength ?? 50}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={customization.pixelateStrength ?? 50}
              onChange={(e) =>
                onChangeCustomization({ pixelateStrength: Number(e.target.value) })
              }
              className="w-full accent-[color:var(--accent-primary)] cursor-pointer"
              style={{ accentColor: theme.accent }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onChangeBackground({ vignette: !background.vignette })}
            className="flex items-center justify-between px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: background.vignette ? theme.accent : theme.badgeBg,
              color: background.vignette ? theme.accentText : theme.textMain,
              border: `2px solid ${theme.shellBorder}`,
            }}
          >
            <span>VIGNETTE</span>
            <span>{background.vignette ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => onChangeBackground({ crtScanlines: !background.crtScanlines })}
            className="flex items-center justify-between px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: background.crtScanlines ? theme.accent : theme.badgeBg,
              color: background.crtScanlines ? theme.accentText : theme.textMain,
              border: `2px solid ${theme.shellBorder}`,
            }}
          >
            <span>CRT LINES</span>
            <span>{background.crtScanlines ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 6: Studio Palette ── */}
      <div>
        <h3 className="mb-2" style={sectionHeaderStyle}>
          STUDIO PALETTE
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {BIN_THEMES.map((t) => {
            const active = customization.binTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChangeCustomization({ binTheme: t.id })}
                className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer"
                style={{
                  fontFamily: '"VT323", monospace',
                  backgroundColor: active ? theme.accent : theme.badgeBg,
                  color: active ? theme.accentText : theme.textMain,
                  border: `2px solid ${theme.shellBorder}`,
                }}
              >
                <span
                  className="w-3 h-3 flex-shrink-0"
                  style={{ backgroundColor: t.swatch, border: `2px solid ${theme.shellBorder}` }}
                />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 7: Layouts & Reset ── */}
      <div className="pt-2 border-t-4 space-y-2" style={{ borderColor: theme.shellBorder }}>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onApplyLayout('grid')}
            className="flex items-center justify-center gap-1 px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: theme.btnBg,
              border: `2px solid ${theme.shellBorder}`,
              color: theme.textMain,
            }}
          >
            <Grid className="w-3 h-3" /> GRID
          </button>
          <button
            onClick={() => onApplyLayout('scatter')}
            className="flex items-center justify-center gap-1 px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: theme.btnBg,
              border: `2px solid ${theme.shellBorder}`,
              color: theme.textMain,
            }}
          >
            <Sparkles className="w-3 h-3" /> SCATTER
          </button>
          <button
            onClick={() => onApplyLayout('shelf')}
            className="flex items-center justify-center gap-1 px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: theme.btnBg,
              border: `2px solid ${theme.shellBorder}`,
              color: theme.textMain,
            }}
          >
            <Rows3 className="w-3 h-3" /> SHELF
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onResetWall}
            className="flex items-center justify-center gap-1 px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: theme.badgeBg,
              border: `2px solid ${theme.shellBorder}`,
              color: theme.textMain,
            }}
          >
            <RotateCcw className="w-3 h-3" /> RESET
          </button>
          <button
            onClick={onClearWall}
            className="flex items-center justify-center gap-1 px-2 py-1 text-sm cursor-pointer"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: '#7f1d1d',
              border: `2px solid ${theme.shellBorder}`,
              color: '#fecaca',
            }}
          >
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}
