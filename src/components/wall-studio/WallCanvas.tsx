import { useRef, useState } from 'react';
import { Disc3 } from 'lucide-react';
import type { AlbumEntry } from '../../types/album';
import type {
  WallBackgroundConfig,
  WallCustomizationConfig,
  WallItem,
} from '../../types/wallStudio';
import { MAX_WALL_ALBUMS } from '../../types/wallStudio';
import WallBackgroundLayer from './WallBackgrounds';
import WallAlbumItem from './WallAlbumItem';

interface WallCanvasProps {
  items: WallItem[];
  albumMap: Map<string, AlbumEntry>;
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onUpdateItem: (key: string, patch: Partial<WallItem>) => void;
  onBringForward: (key: string) => void;
  onSendBackward: (key: string) => void;
  onRemoveItem: (key: string) => void;
}

export default function WallCanvas({
  items,
  albumMap,
  background,
  customization,
  selectedKey,
  onSelectKey,
  onUpdateItem,
  onBringForward,
  onSendBackward,
  onRemoveItem,
}: WallCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  return (
    <div
      ref={canvasRef}
      onClick={() => onSelectKey(null)}
      className="relative w-full h-[540px] sm:h-[600px] lg:h-[640px] rounded-2xl overflow-hidden select-none shadow-2xl border border-white/10"
    >
      {/* Background Texture & Lighting */}
      <WallBackgroundLayer
        config={background}
        showWallTrim={customization.showWallTrim}
      />

      {/* Snap-to-grid visual guide when dragging */}
      {isDraggingAny && customization.snapToGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25 z-10"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)',
            backgroundSize: '5% 5%',
          }}
        />
      )}

      {/* Top-left Capacity Pill */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15">
        <span className="w-2 h-2 rounded-full bg-[color:var(--accent-primary)]" />
        <span className="text-xs font-bold text-white">
          {items.length} / {MAX_WALL_ALBUMS}
        </span>
        <span className="text-[11px] text-white/60 hidden sm:inline">on wall</span>
      </div>

      {/* Top-right Quick Hint */}
      <div className="absolute top-3 right-3 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-[11px] text-white/65">
        Drag to move • Click album to rotate, resize &amp; frame
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-center mb-3">
            <Disc3 className="w-7 h-7 text-white/40" />
          </div>
          <p className="text-base font-serif font-bold text-white/85">
            Your wall is blank
          </p>
          <p className="text-xs text-white/55 max-w-xs mt-1">
            Flip through the 3D pixel album bin below and click &ldquo;Pin to Wall&rdquo; to
            hang up to {MAX_WALL_ALBUMS} records.
          </p>
        </div>
      )}

      {/* Pinned Albums */}
      {items.map((item) => {
        const album = albumMap.get(item.albumKey);
        if (!album) return null;
        return (
          <WallAlbumItem
            key={item.albumKey}
            item={item}
            album={album}
            selected={selectedKey === item.albumKey}
            globalFrame={customization.globalFrame}
            shadowDepth={customization.shadowDepth}
            showRating={customization.showRatings}
            showTitle={customization.showTitles}
            snapToGrid={customization.snapToGrid}
            canvasRef={canvasRef}
            onSelect={() => onSelectKey(item.albumKey)}
            onUpdate={(patch) => onUpdateItem(item.albumKey, patch)}
            onBringForward={() => onBringForward(item.albumKey)}
            onSendBackward={() => onSendBackward(item.albumKey)}
            onRemove={() => onRemoveItem(item.albumKey)}
            onDragStateChange={setIsDraggingAny}
          />
        );
      })}
    </div>
  );
}
