import { useRef, useState } from 'react';
import { Disc3 } from 'lucide-react';
import type { AlbumEntry } from '../../types/album';
import type {
  WallBackgroundConfig,
  WallCustomizationConfig,
  WallItem,
  WallSticker,
} from '../../types/wallStudio';
import { MAX_WALL_ALBUMS } from '../../types/wallStudio';
import WallBackgroundLayer from './WallBackgrounds';
import WallAlbumItem from './WallAlbumItem';
import PixelStickerItem from './PixelStickerItem';
import type { PixelThemeTokens } from './pixelTheme';
import { pixelShadow } from './pixelTheme';

interface WallCanvasProps {
  items: WallItem[];
  stickers: WallSticker[];
  albumMap: Map<string, AlbumEntry>;
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
  theme: PixelThemeTokens;
  selectedKey: string | null;
  selectedStickerId: string | null;
  onSelectKey: (key: string | null) => void;
  onSelectStickerId: (id: string | null) => void;
  onUpdateItem: (key: string, patch: Partial<WallItem>) => void;
  onBringForward: (key: string) => void;
  onSendBackward: (key: string) => void;
  onRemoveItem: (key: string) => void;
  onUpdateSticker: (id: string, patch: Partial<WallSticker>) => void;
  onRemoveSticker: (id: string) => void;
}

export default function WallCanvas({
  items,
  stickers,
  albumMap,
  background,
  customization,
  theme,
  selectedKey,
  selectedStickerId,
  onSelectKey,
  onSelectStickerId,
  onUpdateItem,
  onBringForward,
  onSendBackward,
  onRemoveItem,
  onUpdateSticker,
  onRemoveSticker,
}: WallCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  return (
    <div
      ref={canvasRef}
      onClick={() => {
        onSelectKey(null);
        onSelectStickerId(null);
      }}
      className="relative w-full h-[540px] sm:h-[600px] lg:h-[640px] overflow-hidden select-none"
      style={{
        border: `4px solid ${theme.shellBorder}`,
        boxShadow: pixelShadow(theme.shellBorder, 6),
      }}
    >
      {/* Background Texture & Lighting */}
      <WallBackgroundLayer
        config={background}
        showWallTrim={customization.showWallTrim}
      />

      {/* Snap-to-grid visual guide when dragging */}
      {isDraggingAny && customization.snapToGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-10"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '5% 5%',
          }}
        />
      )}

      {/* Top-left Pixel Capacity Pill */}
      <div
        className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5"
        style={{
          backgroundColor: theme.badgeBg,
          border: `3px solid ${theme.shellBorder}`,
          boxShadow: pixelShadow(theme.shellBorder, 3),
          color: theme.textMain,
        }}
      >
        <span
          className="w-2.5 h-2.5 inline-block"
          style={{ backgroundColor: theme.accent }}
        />
        <span
          className="text-[10px] leading-none"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {items.length}/{MAX_WALL_ALBUMS}
        </span>
        <span
          className="text-sm leading-none hidden sm:inline"
          style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}
        >
          ON WALL
        </span>
      </div>

      {/* Top-right Quick Hint */}
      <div
        className="absolute top-3 right-3 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1"
        style={{
          backgroundColor: theme.badgeBg,
          border: `3px solid ${theme.shellBorder}`,
          boxShadow: pixelShadow(theme.shellBorder, 3),
          fontFamily: '"VT323", monospace',
          color: theme.textMain,
        }}
      >
        DRAG TO MOVE • CLICK TO ROTATE / RESIZE / FRAME
      </div>

      {/* Empty State */}
      {items.length === 0 && stickers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 pointer-events-none">
          <div
            className="w-14 h-14 flex items-center justify-center mb-3"
            style={{
              backgroundColor: theme.badgeBg,
              border: `3px solid ${theme.shellBorder}`,
              boxShadow: pixelShadow(theme.shellBorder, 3),
              color: theme.accent,
            }}
          >
            <Disc3 className="w-7 h-7" />
          </div>
          <p
            className="text-xs px-3 py-1.5"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              backgroundColor: theme.badgeBg,
              border: `3px solid ${theme.shellBorder}`,
              color: theme.textMain,
            }}
          >
            WALL IS EMPTY!
          </p>
          <p
            className="text-lg mt-2 px-3 py-1"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: theme.badgeBg,
              border: `2px solid ${theme.shellBorder}`,
              color: theme.textMuted,
            }}
          >
            Flip through the 3D pixel record bin below &amp; click PIN TO WALL.
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
            theme={theme}
            canvasRef={canvasRef}
            onSelect={() => {
              onSelectStickerId(null);
              onSelectKey(item.albumKey);
            }}
            onUpdate={(patch) => onUpdateItem(item.albumKey, patch)}
            onBringForward={() => onBringForward(item.albumKey)}
            onSendBackward={() => onSendBackward(item.albumKey)}
            onRemove={() => onRemoveItem(item.albumKey)}
            onDragStateChange={setIsDraggingAny}
          />
        );
      })}

      {/* Pixel Stickers */}
      {stickers.map((sticker) => (
        <PixelStickerItem
          key={sticker.id}
          sticker={sticker}
          selected={selectedStickerId === sticker.id}
          canvasRef={canvasRef}
          borderColor={theme.shellBorder}
          accentColor={theme.accent}
          onSelect={() => {
            onSelectKey(null);
            onSelectStickerId(sticker.id);
          }}
          onUpdate={(patch) => onUpdateSticker(sticker.id, patch)}
          onRemove={() => onRemoveSticker(sticker.id)}
        />
      ))}
    </div>
  );
}
