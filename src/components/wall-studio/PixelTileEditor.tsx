import { useState, useRef } from 'react';
import { Paintbrush, Eraser, PaintBucket, FlipHorizontal2, Trash2 } from 'lucide-react';
import { createStarterPixelGrid } from '../../lib/wallStudioStore';
import type { PixelThemeTokens } from './pixelTheme';
import { pixelShadow } from './pixelTheme';

interface PixelTileEditorProps {
  grid: string[];
  tileSize: number;
  theme: PixelThemeTokens;
  onChangeGrid: (nextGrid: string[]) => void;
  onChangeTileSize: (size: number) => void;
}

const RETRO_PALETTE = [
  '#1b1024', '#2a1b3d', '#0f172a', '#1e293b',
  '#ffffff', '#fef3c7', '#ffd166', '#f77f00',
  '#ff4d79', '#ff8fab', '#c77dff', '#7c3aed',
  '#38bdf8', '#06b6d4', '#4ade80', '#ef4444',
];

type Tool = 'draw' | 'erase' | 'fill';

export default function PixelTileEditor({
  grid,
  tileSize,
  theme,
  onChangeGrid,
  onChangeTileSize,
}: PixelTileEditorProps) {
  const [selectedColor, setSelectedColor] = useState('#ff8fab');
  const [tool, setTool] = useState<Tool>('draw');
  const [mirrorX, setMirrorX] = useState(false);
  const isPainting = useRef(false);

  const safeGrid = grid.length === 256 ? grid : createStarterPixelGrid('stars');

  const applyCell = (idx: number) => {
    const x = idx % 16;
    const y = Math.floor(idx / 16);

    if (tool === 'fill') {
      const targetColor = safeGrid[idx];
      if (targetColor === selectedColor) return;
      const next = [...safeGrid];
      const stack = [idx];
      const visited = new Set<number>();
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        if (next[cur] !== targetColor) continue;
        next[cur] = selectedColor;
        const cx = cur % 16;
        const cy = Math.floor(cur / 16);
        if (cx > 0) stack.push(cur - 1);
        if (cx < 15) stack.push(cur + 1);
        if (cy > 0) stack.push(cur - 16);
        if (cy < 15) stack.push(cur + 16);
      }
      onChangeGrid(next);
      return;
    }

    const paintColor = tool === 'erase' ? '#181825' : selectedColor;
    const next = [...safeGrid];
    next[idx] = paintColor;
    if (mirrorX) {
      const mx = 15 - x;
      next[y * 16 + mx] = paintColor;
    }
    onChangeGrid(next);
  };

  return (
    <div
      className="p-2.5 space-y-2.5"
      style={{
        backgroundColor: theme.shellBg,
        border: `3px solid ${theme.shellBorder}`,
      }}
    >
      {/* Tool bar */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {[
            { id: 'draw' as const, icon: <Paintbrush className="w-3.5 h-3.5" />, label: 'Draw' },
            { id: 'fill' as const, icon: <PaintBucket className="w-3.5 h-3.5" />, label: 'Fill' },
            { id: 'erase' as const, icon: <Eraser className="w-3.5 h-3.5" />, label: 'Erase' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setTool(btn.id)}
              title={btn.label}
              className="p-1.5 cursor-pointer"
              style={{
                backgroundColor: tool === btn.id ? theme.accent : theme.btnBg,
                color: tool === btn.id ? theme.accentText : theme.textMain,
                border: `2px solid ${theme.shellBorder}`,
              }}
            >
              {btn.icon}
            </button>
          ))}
          <button
            onClick={() => setMirrorX((v) => !v)}
            title="Mirror Horizontal"
            className="p-1.5 cursor-pointer"
            style={{
              backgroundColor: mirrorX ? theme.accent : theme.btnBg,
              color: mirrorX ? theme.accentText : theme.textMain,
              border: `2px solid ${theme.shellBorder}`,
            }}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => onChangeGrid(createStarterPixelGrid('empty'))}
          title="Clear tile"
          className="p-1.5 cursor-pointer"
          style={{
            backgroundColor: theme.btnBg,
            color: theme.textMain,
            border: `2px solid ${theme.shellBorder}`,
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 16x16 Interactive Pixel Grid */}
      <div
        className="grid grid-cols-16 w-full aspect-square select-none touch-none cursor-crosshair"
        style={{
          gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
          border: `3px solid ${theme.shellBorder}`,
          boxShadow: pixelShadow(theme.shellBorder, 2),
        }}
        onPointerUp={() => { isPainting.current = false; }}
        onPointerLeave={() => { isPainting.current = false; }}
      >
        {safeGrid.map((color, idx) => (
          <div
            key={idx}
            onPointerDown={(e) => {
              e.preventDefault();
              isPainting.current = true;
              applyCell(idx);
            }}
            onPointerEnter={() => {
              if (isPainting.current && tool !== 'fill') {
                applyCell(idx);
              }
            }}
            style={{
              backgroundColor: color,
              borderRight: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        ))}
      </div>

      {/* Palette Swatches */}
      <div className="grid grid-cols-8 gap-1">
        {RETRO_PALETTE.map((hex) => (
          <button
            key={hex}
            onClick={() => {
              setSelectedColor(hex);
              if (tool === 'erase') setTool('draw');
            }}
            className="w-full aspect-square cursor-pointer"
            style={{
              backgroundColor: hex,
              border: selectedColor === hex ? `2px solid ${theme.accent}` : `2px solid ${theme.shellBorder}`,
              transform: selectedColor === hex ? 'scale(1.12)' : 'scale(1)',
            }}
            title={hex}
          />
        ))}
      </div>

      {/* Custom Color + Presets */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ fontFamily: '"VT323", monospace', color: theme.textMain }}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => {
              setSelectedColor(e.target.value);
              if (tool === 'erase') setTool('draw');
            }}
            className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
          />
          PICK
        </label>

        <div className="flex gap-1">
          {(['stars', 'hearts', 'checker'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onChangeGrid(createStarterPixelGrid(preset))}
              className="px-1.5 py-0.5 text-xs uppercase cursor-pointer"
              style={{
                fontFamily: '"VT323", monospace',
                backgroundColor: theme.btnBg,
                color: theme.textMain,
                border: `2px solid ${theme.shellBorder}`,
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Tile Size Slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs whitespace-nowrap" style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}>
          TILE {tileSize}px
        </span>
        <input
          type="range"
          min={48}
          max={160}
          step={16}
          value={tileSize}
          onChange={(e) => onChangeTileSize(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: theme.accent }}
        />
      </div>
    </div>
  );
}
