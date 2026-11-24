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

interface WallAlbumItemProps {
  item: WallItem;
  album: AlbumEntry;
  selected: boolean;
  globalFrame: FrameStyle;
  shadowDepth: ShadowDepth;
  showRating: boolean;
  showTitle: boolean;
  snapToGrid: boolean;
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
  if (r >= 9) return '#a855f7';
  if (r >= 7.5) return '#06b6d4';
  if (r >= 6) return '#3b82f6';
  if (r >= 4) return '#f59e0b';
  return '#ef4444';
}

function getShadowStyle(depth: ShadowDepth, selected: boolean): string {
  if (selected) {
    return '0 18px 40px rgba(0,0,0,0.65), 0 0 0 2px var(--accent-primary)';
  }
  if (depth === 'none') return 'none';
  if (depth === 'soft') return '0 6px 16px rgba(0,0,0,0.35)';
  return '0 14px 30px rgba(0,0,0,0.58), 0 4px 8px rgba(0,0,0,0.35)';
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
  const baseSizePx = 112; // base square size before scale

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
      // Gentle snap to 0° when close
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
      {/* ── Selection Controls (Rotation handle + micro toolbar) ── */}
      {selected && (
        <>
          {/* Rotation Handle */}
          <div
            onPointerDown={handlePointerDownRotate}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onUpdate({ rotation: 0 });
            }}
            title="Drag to rotate (double-click to reset 0°)"
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-ew-resize z-30"
          >
            <div className="w-6 h-6 rounded-full bg-[color:var(--accent-primary)] text-white flex items-center justify-center shadow-lg border border-white/30 hover:scale-110 transition-transform">
              <RotateCw className="w-3 h-3" />
            </div>
            <div className="w-px h-2 bg-[color:var(--accent-primary)]" />
          </div>

          {/* Bottom Floating Micro-Toolbar */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/20 shadow-xl z-30 whitespace-nowrap"
          >
            <button
              onClick={() =>
                onUpdate({ scale: Math.max(0.65, Math.round((item.scale - 0.1) * 100) / 100) })
              }
              title="Smaller"
              className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() =>
                onUpdate({ scale: Math.min(1.5, Math.round((item.scale + 0.1) * 100) / 100) })
              }
              title="Larger"
              className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={onBringForward}
              title="Bring Forward"
              className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={onSendBackward}
              title="Send Backward"
              className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              onClick={cycleFrameOverride}
              title={`Frame: ${activeFrame} (click to cycle)`}
              className="p-1 text-cyan-300 hover:text-cyan-200 rounded-full hover:bg-white/10"
            >
              <Frame className="w-3 h-3" />
            </button>
            <button
              onClick={onRemove}
              title="Remove from wall"
              className="p-1 text-red-400 hover:text-red-300 rounded-full hover:bg-red-500/20"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {/* ── Frame Decor: Pushpin ── */}
      {activeFrame === 'pushpin' && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-rose-400 to-rose-700 border border-white/40 shadow-md" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60 absolute top-0.5 left-0.5" />
        </div>
      )}

      {/* ── Frame Decor: Masking Tape ── */}
      {activeFrame === 'tape' && (
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-10 h-4 z-20 pointer-events-none -rotate-2"
          style={{
            background: 'rgba(245, 232, 185, 0.72)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* ── Frame Decor: Vinyl Peek ── */}
      {activeFrame === 'vinyl-peek' && (
        <div
          className="absolute top-1/2 -right-5 -translate-y-1/2 w-24 h-24 rounded-full pointer-events-none transition-transform duration-300 group-hover:translate-x-2"
          style={{
            background:
              'radial-gradient(circle, #e11d48 0%, #e11d48 16%, #18181b 17%, #09090b 45%, #27272a 46%, #09090b 68%, #1f1f23 69%, #09090b 100%)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
          }}
        >
          <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-zinc-300" />
        </div>
      )}

      {/* ── Main Album Sleeve / Frame Container ── */}
      <div
        className={`relative transition-shadow duration-200 ${
          activeFrame === 'matte'
            ? 'p-1.5 bg-[#121215] border border-white/15 rounded-sm'
            : activeFrame === 'polaroid'
            ? 'p-1.5 pb-5 bg-[#f4f1ea] rounded-sm'
            : 'rounded-md overflow-hidden'
        }`}
        style={{
          boxShadow: getShadowStyle(shadowDepth, selected),
        }}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-zinc-900">
          {hasCover ? (
            <img
              src={album.CoverArt}
              alt={`${String(album.Album)} by ${album.Artist}`}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
              <Music className="w-6 h-6 text-white/25" />
            </div>
          )}

          {/* Rating Badge */}
          {showRating && (
            <div
              className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white leading-none shadow"
              style={{ backgroundColor: ratingBadgeColor(album.Rating) }}
            >
              {album.Rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Polaroid Caption */}
        {activeFrame === 'polaroid' && (
          <div className="mt-1 px-0.5 text-center">
            <p className="text-[9px] font-bold text-zinc-800 truncate leading-tight">
              {String(album.Album)}
            </p>
            <p className="text-[8px] text-zinc-500 truncate leading-tight">
              {album.Artist}
            </p>
          </div>
        )}
      </div>

      {/* Optional Floating Title Plaque (non-polaroid) */}
      {showTitle && activeFrame !== 'polaroid' && (
        <div className="mt-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-center">
          <p className="text-[9px] font-semibold text-white truncate leading-tight">
            {String(album.Album)}
          </p>
        </div>
      )}
    </div>
  );
}
