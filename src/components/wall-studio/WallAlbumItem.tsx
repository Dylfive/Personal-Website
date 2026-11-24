import { useRef, useState } from 'react';
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  X,
  Music,
  Frame,
} from 'lucide-react';
import type { AlbumEntry } from '../../types/album';
import type {
  WallItem,
  FrameStyle,
  ShadowDepth,
} from '../../types/wallStudio';
import type { PixelThemeTokens } from './pixelTheme';
import { pixelShadow } from './pixelTheme';

interface WallAlbumItemProps {
  item: WallItem;
  album: AlbumEntry;
  selected: boolean;
  globalFrame: FrameStyle;
  shadowDepth: ShadowDepth;
  showRating: boolean;
  showTitle: boolean;
  snapToGrid: boolean;
  theme: PixelThemeTokens;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (patch: Partial<WallItem>) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onRemove: () => void;
  onDragStateChange: (dragging: boolean) => void;
}

const FRAME_CYCLE: FrameStyle[] = [
  'bare',
  'matte',
  'polaroid',
  'vinyl-peek',
  'tape',
  'pushpin',
];

function ratingBadgeColor(r: number): string {
  if (r >= 9) return '#ff4d79';
  if (r >= 7.5) return '#06b6d4';
  if (r >= 6) return '#3b82f6';
  if (r >= 4) return '#f59e0b';
  return '#ef4444';
}

function getPixelShadow(depth: ShadowDepth, selected: boolean, borderColor: string, accentColor: string): string {
  if (selected) {
    return `5px 5px 0px ${accentColor}`;
  }
  if (depth === 'none') return 'none';
  if (depth === 'soft') return `3px 3px 0px ${borderColor}`;
  return `6px 6px 0px rgba(0,0,0,0.65)`;
}

export default function WallAlbumItem({
  item,
  album,
  selected,
  globalFrame,
  shadowDepth,
  showRating,
  showTitle,
  snapToGrid,
  theme,
  canvasRef,
  onSelect,
  onUpdate,
  onBringForward,
  onSendBackward,
  onRemove,
  onDragStateChange,
}: WallAlbumItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeFrame = item.frameStyle ?? globalFrame;
  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
  const baseSizePx = 112;

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = item.x;
    const origY = item.y;

    setIsDragging(true);
    onDragStateChange(true);

    const handleMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let nextX = Math.max(4, Math.min(96, origX + dxPct));
      let nextY = Math.max(6, Math.min(94, origY + dyPct));

      if (snapToGrid) {
        nextX = Math.round(nextX / 5) * 5;
        nextY = Math.round(nextY / 5) * 5;
      }

      onUpdate({
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      onDragStateChange(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handlePointerDownRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    const el = itemRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const handleMove = (ev: PointerEvent) => {
      const rad = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let deg = Math.round((rad * 180) / Math.PI + 90);
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;
      if (Math.abs(deg) <= 3) deg = 0;
      onUpdate({ rotation: deg });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const cycleFrameOverride = (e: React.MouseEvent) => {
    e.stopPropagation();
    const curIdx = FRAME_CYCLE.indexOf(activeFrame);
    const next = FRAME_CYCLE[(curIdx + 1) % FRAME_CYCLE.length];
    onUpdate({ frameStyle: next === globalFrame ? undefined : next });
  };

  return (
    <div
      ref={itemRef}
      onPointerDown={handlePointerDownDrag}
      onClick={(e) => e.stopPropagation()}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        zIndex: selected ? 999 : item.zIndex,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
        width: `${baseSizePx}px`,
      }}
      className={`absolute select-none group ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* ── Selection Controls (Pixel Rotation Handle & Toolbar) ── */}
      {selected && (
        <>
          <div
            onPointerDown={handlePointerDownRotate}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onUpdate({ rotation: 0 });
            }}
            title="Drag to rotate (double-click to reset 0°)"
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-ew-resize z-30"
          >
            <div
              className="w-6 h-6 flex items-center justify-center"
              style={{
                backgroundColor: theme.accent,
                color: theme.accentText,
                border: `2px solid ${theme.shellBorder}`,
                boxShadow: pixelShadow(theme.shellBorder, 2),
              }}
            >
              <RotateCw className="w-3 h-3" />
            </div>
            <div className="w-0.5 h-2" style={{ backgroundColor: theme.shellBorder }} />
          </div>

          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1 py-1 z-30 whitespace-nowrap"
            style={{
              backgroundColor: theme.shellBg,
              border: `3px solid ${theme.shellBorder}`,
              boxShadow: pixelShadow(theme.shellBorder, 3),
            }}
          >
            <button
              onClick={() =>
                onUpdate({ scale: Math.max(0.65, Math.round((item.scale - 0.1) * 100) / 100) })
              }
              title="Smaller"
              className="p-1 hover:opacity-80"
              style={{ color: theme.textMain }}
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() =>
                onUpdate({ scale: Math.min(1.5, Math.round((item.scale + 0.1) * 100) / 100) })
              }
              title="Larger"
              className="p-1 hover:opacity-80"
              style={{ color: theme.textMain }}
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={onBringForward}
              title="Bring Forward"
              className="p-1 hover:opacity-80"
              style={{ color: theme.textMain }}
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={onSendBackward}
              title="Send Backward"
              className="p-1 hover:opacity-80"
              style={{ color: theme.textMain }}
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              onClick={cycleFrameOverride}
              title={`Frame: ${activeFrame} (click to cycle)`}
              className="p-1 hover:opacity-80"
              style={{ color: theme.accent }}
            >
              <Frame className="w-3 h-3" />
            </button>
            <button
              onClick={onRemove}
              title="Remove from wall"
              className="p-1 text-red-500 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {/* ── Pixel Pushpin ── */}
      {activeFrame === 'pushpin' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="w-3.5 h-3.5 bg-[#ff4d79] border-2 border-black shadow-[2px_2px_0px_#000]" />
        </div>
      )}

      {/* ── Pixel Masking Tape ── */}
      {activeFrame === 'tape' && (
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-10 h-3.5 z-20 pointer-events-none -rotate-2 border-2 border-black/40"
          style={{ background: '#f6e3a1' }}
        />
      )}

      {/* ── Pixel Vinyl Peek ── */}
      {activeFrame === 'vinyl-peek' && (
        <div
          className="absolute top-1/2 -right-5 -translate-y-1/2 w-24 h-24 rounded-full pointer-events-none transition-transform duration-200 group-hover:translate-x-2 border-2 border-black"
          style={{
            background:
              'radial-gradient(circle, #ff4d79 0%, #ff4d79 18%, #18181b 19%, #09090b 45%, #27272a 46%, #09090b 100%)',
          }}
        >
          <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white" />
        </div>
      )}

      {/* ── Main Album Sleeve / Pixel Frame ── */}
      <div
        className={`relative ${
          activeFrame === 'matte'
            ? 'p-1.5 bg-[#121215]'
            : activeFrame === 'polaroid'
            ? 'p-1.5 pb-5 bg-[#fef9ef]'
            : ''
        }`}
        style={{
          border: `3px solid ${theme.shellBorder}`,
          boxShadow: getPixelShadow(shadowDepth, selected, theme.shellBorder, theme.accent),
        }}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
          {hasCover ? (
            <img
              src={album.CoverArt}
              alt={`${String(album.Album)} by ${album.Artist}`}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <Music className="w-6 h-6 text-white/25" />
            </div>
          )}

          {/* Pixel Rating Badge */}
          {showRating && (
            <div
              className="absolute top-1 right-1 px-1 py-0.5 text-[8px] text-white leading-none border-2 border-black"
              style={{
                backgroundColor: ratingBadgeColor(album.Rating),
                fontFamily: '"Press Start 2P", monospace',
              }}
            >
              {album.Rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Polaroid Caption */}
        {activeFrame === 'polaroid' && (
          <div className="mt-1 px-0.5 text-center">
            <p
              className="text-sm font-bold text-zinc-900 truncate leading-none"
              style={{ fontFamily: '"VT323", monospace' }}
            >
              {String(album.Album)}
            </p>
            <p
              className="text-xs text-zinc-600 truncate leading-none"
              style={{ fontFamily: '"VT323", monospace' }}
            >
              {album.Artist}
            </p>
          </div>
        )}
      </div>

      {/* Optional Floating Pixel Title Plaque */}
      {showTitle && activeFrame !== 'polaroid' && (
        <div
          className="mt-1.5 px-1.5 py-0.5 text-center"
          style={{
            backgroundColor: theme.badgeBg,
            border: `2px solid ${theme.shellBorder}`,
            boxShadow: pixelShadow(theme.shellBorder, 2),
          }}
        >
          <p
            className="text-xs truncate leading-none"
            style={{ fontFamily: '"VT323", monospace', color: theme.textMain }}
          >
            {String(album.Album)}
          </p>
        </div>
      )}
    </div>
  );
}
