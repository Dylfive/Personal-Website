import { useRef, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut, X } from 'lucide-react';
import type { PixelStickerKind, WallSticker } from '../../types/wallStudio';

interface PixelStickerItemProps {
  sticker: WallSticker;
  selected: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  borderColor: string;
  accentColor: string;
  onSelect: () => void;
  onUpdate: (patch: Partial<WallSticker>) => void;
  onRemove: () => void;
}

export function PixelStickerSprite({ kind, size = 44 }: { kind: PixelStickerKind; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="pointer-events-none select-none drop-shadow-[2px_2px_0px_rgba(0,0,0,0.65)]"
    >
      {kind === 'star' && (
        <>
          <rect x="7" y="1" width="2" height="14" fill="#ffd166" />
          <rect x="1" y="7" width="14" height="2" fill="#ffd166" />
          <rect x="5" y="4" width="6" height="8" fill="#ffd166" />
          <rect x="4" y="5" width="8" height="6" fill="#ffd166" />
          <rect x="3" y="12" width="2" height="2" fill="#ffd166" />
          <rect x="11" y="12" width="2" height="2" fill="#ffd166" />
          <rect x="6" y="6" width="2" height="2" fill="#fff8d6" />
        </>
      )}
      {kind === 'heart' && (
        <>
          <rect x="3" y="3" width="4" height="2" fill="#ff4d79" />
          <rect x="9" y="3" width="4" height="2" fill="#ff4d79" />
          <rect x="2" y="5" width="12" height="4" fill="#ff4d79" />
          <rect x="3" y="9" width="10" height="2" fill="#ff4d79" />
          <rect x="5" y="11" width="6" height="2" fill="#ff4d79" />
          <rect x="7" y="13" width="2" height="1" fill="#ff4d79" />
          <rect x="4" y="5" width="2" height="2" fill="#ffb3c6" />
        </>
      )}
      {kind === 'note' && (
        <>
          <rect x="6" y="2" width="7" height="2" fill="#7cc6fe" />
          <rect x="6" y="4" width="2" height="8" fill="#7cc6fe" />
          <rect x="11" y="4" width="2" height="7" fill="#7cc6fe" />
          <rect x="3" y="10" width="5" height="4" fill="#7cc6fe" />
          <rect x="8" y="9" width="5" height="4" fill="#7cc6fe" />
          <rect x="4" y="11" width="2" height="1" fill="#e0f2fe" />
        </>
      )}
      {kind === 'sparkle' && (
        <>
          <rect x="7" y="1" width="2" height="14" fill="#c4b5fd" />
          <rect x="1" y="7" width="14" height="2" fill="#c4b5fd" />
          <rect x="6" y="5" width="4" height="6" fill="#e9d5ff" />
          <rect x="5" y="6" width="6" height="4" fill="#e9d5ff" />
          <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
        </>
      )}
      {kind === 'cassette' && (
        <>
          <rect x="1" y="3" width="14" height="10" fill="#ff8fab" />
          <rect x="2" y="4" width="12" height="8" fill="#3b1525" />
          <rect x="3" y="5" width="10" height="4" fill="#ffe5ec" />
          <rect x="4" y="6" width="2" height="2" fill="#3b1525" />
          <rect x="10" y="6" width="2" height="2" fill="#3b1525" />
          <rect x="6" y="6" width="4" height="2" fill="#ff4d79" />
          <rect x="4" y="10" width="8" height="2" fill="#ffb3c6" />
        </>
      )}
      {kind === 'crown' && (
        <>
          <rect x="2" y="4" width="2" height="7" fill="#fbbf24" />
          <rect x="7" y="3" width="2" height="8" fill="#fbbf24" />
          <rect x="12" y="4" width="2" height="7" fill="#fbbf24" />
          <rect x="4" y="7" width="8" height="5" fill="#fbbf24" />
          <rect x="2" y="11" width="12" height="2" fill="#d97706" />
          <rect x="7" y="8" width="2" height="2" fill="#ff4d79" />
        </>
      )}
      {kind === 'plant' && (
        <>
          <rect x="5" y="10" width="6" height="5" fill="#d97706" />
          <rect x="4" y="9" width="8" height="2" fill="#f59e0b" />
          <rect x="7" y="4" width="2" height="5" fill="#22c55e" />
          <rect x="4" y="5" width="3" height="3" fill="#4ade80" />
          <rect x="9" y="4" width="3" height="3" fill="#4ade80" />
          <rect x="6" y="2" width="4" height="2" fill="#86efac" />
        </>
      )}
      {kind === 'moon' && (
        <>
          <rect x="6" y="2" width="5" height="2" fill="#fde047" />
          <rect x="4" y="4" width="4" height="2" fill="#fde047" />
          <rect x="3" y="6" width="3" height="4" fill="#fde047" />
          <rect x="4" y="10" width="4" height="2" fill="#fde047" />
          <rect x="6" y="12" width="5" height="2" fill="#fde047" />
          <rect x="11" y="4" width="2" height="1" fill="#fef08a" />
          <rect x="11" y="11" width="2" height="1" fill="#fef08a" />
        </>
      )}
    </svg>
  );
}

export default function PixelStickerItem({
  sticker,
  selected,
  canvasRef,
  borderColor,
  accentColor,
  onSelect,
  onUpdate,
  onRemove,
}: PixelStickerItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = sticker.x;
    const origY = sticker.y;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      onUpdate({
        x: Math.max(4, Math.min(96, Math.round((origX + dx) * 10) / 10)),
        y: Math.max(4, Math.min(96, Math.round((origY + dy) * 10) / 10)),
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    const el = itemRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const onMove = (ev: PointerEvent) => {
      const rad = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let deg = Math.round((rad * 180) / Math.PI + 90);
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;
      onUpdate({ rotation: deg });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={itemRef}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        zIndex: selected ? 998 : sticker.zIndex,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
      }}
      className={`absolute select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {selected && (
        <>
          <div
            onPointerDown={handleRotate}
            className="absolute -top-7 left-1/2 -translate-x-1/2 cursor-ew-resize z-30 p-1"
            style={{
              backgroundColor: accentColor,
              border: `2px solid ${borderColor}`,
              color: '#fff',
            }}
          >
            <RotateCw className="w-3 h-3" />
          </div>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-0.5 z-30"
            style={{
              backgroundColor: '#111',
              border: `2px solid ${borderColor}`,
            }}
          >
            <button
              onClick={() => onUpdate({ scale: Math.max(0.6, sticker.scale - 0.15) })}
              className="p-0.5 text-white/80 hover:text-white"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdate({ scale: Math.min(2.2, sticker.scale + 0.15) })}
              className="p-0.5 text-white/80 hover:text-white"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={onRemove}
              className="p-0.5 text-red-400 hover:text-red-300"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      <div
        className="p-1"
        style={{
          outline: selected ? `2px dashed ${accentColor}` : 'none',
        }}
      >
        <PixelStickerSprite kind={sticker.kind} size={44} />
      </div>
    </div>
  );
}
