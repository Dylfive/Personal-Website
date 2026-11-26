import { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  MousePointer,
  Hand,
  Pencil,
  Eraser,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
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

type CanvasTool = 'select' | 'pan' | 'draw' | 'erase';

const DRAW_GRID_W = 160;
const DRAW_GRID_H = 100;

const DRAW_COLORS = [
  '#ff4d79',
  '#ffd166',
  '#4ade80',
  '#38bdf8',
  '#c084fc',
  '#ffffff',
  '#111827',
];

interface WallCanvasProps {
  items: WallItem[];
  stickers: WallSticker[];
  albumMap: Map<string, AlbumEntry>;
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
  wallDrawingDataUrl?: string;
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
  onUpdateDrawing: (dataUrl: string | undefined) => void;
}

export default function WallCanvas({
  items,
  stickers,
  albumMap,
  background,
  customization,
  wallDrawingDataUrl,
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
  onUpdateDrawing,
}: WallCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [tool, setTool] = useState<CanvasTool>('select');

  // Camera state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  // Pixel drawing state
  const [drawColor, setDrawColor] = useState('#ff4d79');
  const [brushSize, setBrushSize] = useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = useState<(string | undefined)[]>([]);
  const isDrawingRef = useRef(false);
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null);
  const lastLoadedUrlRef = useRef<string | undefined>(undefined);

  // Spacebar shortcut for temporary pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Sync persisted drawing data URL into the 160x100 pixel canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    if (wallDrawingDataUrl === lastLoadedUrlRef.current) return;
    lastLoadedUrlRef.current = wallDrawingDataUrl;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, DRAW_GRID_W, DRAW_GRID_H);

    if (!wallDrawingDataUrl) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, DRAW_GRID_W, DRAW_GRID_H);
      ctx.drawImage(img, 0, 0, DRAW_GRID_W, DRAW_GRID_H);
    };
    img.src = wallDrawingDataUrl;
  }, [wallDrawingDataUrl]);

  const effectivePanMode = tool === 'pan' || spacePressed;

  // ── Camera Controls ──────────────────────────────────────────────────────────
  const handleViewportPointerDown = (e: React.PointerEvent) => {
    const isMiddle = e.button === 1;
    const isAltPan = e.button === 0 && e.altKey;
    if (!effectivePanMode && !isMiddle && !isAltPan) return;

    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const origPan = { ...pan };

    const handleMove = (ev: PointerEvent) => {
      setPan({
        x: Math.round(origPan.x + (ev.clientX - startX)),
        y: Math.round(origPan.y + (ev.clientY - startY)),
      });
    };

    const handleUp = () => {
      setIsPanning(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!effectivePanMode && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.max(0.5, Math.min(2.5, Math.round((z + delta) * 100) / 100)));
  };

  const resetCamera = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // ── Pixel Drawing Helpers ────────────────────────────────────────────────────
  const clientToGrid = (clientX: number, clientY: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor(((clientX - rect.left) / rect.width) * DRAW_GRID_W);
    const gy = Math.floor(((clientY - rect.top) / rect.height) * DRAW_GRID_H);
    return {
      x: Math.max(0, Math.min(DRAW_GRID_W - 1, gx)),
      y: Math.max(0, Math.min(DRAW_GRID_H - 1, gy)),
    };
  };

  const stampPixel = (ctx: CanvasRenderingContext2D, cx: number, cy: number, erase: boolean) => {
    const half = Math.floor(brushSize / 2);
    const x0 = cx - half;
    const y0 = cy - half;
    if (erase) {
      ctx.clearRect(x0, y0, brushSize, brushSize);
    } else {
      ctx.fillStyle = drawColor;
      ctx.fillRect(x0, y0, brushSize, brushSize);
    }
  };

  const drawBresenhamLine = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    erase: boolean
  ) => {
    let cx = x0;
    let cy = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      stampPixel(ctx, cx, cy, erase);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  };

  const handleDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || effectivePanMode || e.altKey) return;
    if (tool !== 'draw' && tool !== 'erase') return;
    e.stopPropagation();

    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Save undo snapshot before stroke
    setUndoStack((prev) => [...prev.slice(-19), wallDrawingDataUrl]);

    isDrawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const pt = clientToGrid(e.clientX, e.clientY);
    lastPixelRef.current = pt;
    stampPixel(ctx, pt.x, pt.y, tool === 'erase');
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pt = clientToGrid(e.clientX, e.clientY);
    const prev = lastPixelRef.current ?? pt;
    drawBresenhamLine(ctx, prev.x, prev.y, pt.x, pt.y, tool === 'erase');
    lastPixelRef.current = pt;
  };

  const commitDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPixelRef.current = null;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const nextUrl = canvas.toDataURL('image/png');
    lastLoadedUrlRef.current = nextUrl;
    onUpdateDrawing(nextUrl);
  };

  const handleUndoDrawing = () => {
    if (undoStack.length === 0) return;
    const prevUrl = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    lastLoadedUrlRef.current = undefined;
    onUpdateDrawing(prevUrl);
  };

  const handleClearDrawing = () => {
    if (!wallDrawingDataUrl) return;
    setUndoStack((s) => [...s.slice(-19), wallDrawingDataUrl]);
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, DRAW_GRID_W, DRAW_GRID_H);
    lastLoadedUrlRef.current = undefined;
    onUpdateDrawing(undefined);
  };

  return (
    <div
      ref={viewportRef}
      onPointerDown={handleViewportPointerDown}
      onWheel={handleWheel}
      onClick={() => {
        if (tool === 'select' && !effectivePanMode) {
          onSelectKey(null);
          onSelectStickerId(null);
        }
      }}
      className={`relative w-full h-[540px] sm:h-[600px] lg:h-[640px] overflow-hidden select-none bg-[#0b0b10] ${
        effectivePanMode
          ? isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : tool === 'draw' || tool === 'erase'
          ? 'cursor-crosshair'
          : ''
      }`}
      style={{
        border: `4px solid ${theme.shellBorder}`,
        boxShadow: pixelShadow(theme.shellBorder, 6),
      }}
    >
      {/* ── Camera-Transformed Wall Stage ── */}
      <div
        ref={stageRef}
        className="relative w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
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

        {/* Empty State */}
        {items.length === 0 && stickers.length === 0 && !wallDrawingDataUrl && (
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
              selected={tool === 'select' && selectedKey === item.albumKey}
              globalFrame={customization.globalFrame}
              shadowDepth={customization.shadowDepth}
              showRating={customization.showRatings}
              showTitle={customization.showTitles}
              snapToGrid={customization.snapToGrid}
              pixelateAlbums={!!customization.pixelateAlbums}
              theme={theme}
              canvasRef={stageRef}
              onSelect={() => {
                if (tool !== 'select' || effectivePanMode) return;
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
            selected={tool === 'select' && selectedStickerId === sticker.id}
            borderColor={theme.shellBorder}
            accentColor={theme.accent}
            canvasRef={stageRef}
            onSelect={() => {
              if (tool !== 'select' || effectivePanMode) return;
              onSelectKey(null);
              onSelectStickerId(sticker.id);
            }}
            onUpdate={(patch) => onUpdateSticker(sticker.id, patch)}
            onRemove={() => onRemoveSticker(sticker.id)}
          />
        ))}

        {/* Whole-Wall Pixel Art Drawing Layer */}
        <canvas
          ref={drawCanvasRef}
          width={DRAW_GRID_W}
          height={DRAW_GRID_H}
          onPointerDown={handleDrawPointerDown}
          onPointerMove={handleDrawPointerMove}
          onPointerUp={commitDrawing}
          onPointerCancel={commitDrawing}
          className="absolute inset-0 w-full h-full"
          style={{
            zIndex: 600,
            imageRendering: 'pixelated',
            pointerEvents:
              (tool === 'draw' || tool === 'erase') && !effectivePanMode ? 'auto' : 'none',
            touchAction: 'none',
          }}
        />
      </div>

      {/* ── Fixed HUD Overlays (outside transformed stage) ── */}

      {/* Top-left Pixel Capacity Pill */}
      <div
        className="absolute top-3 left-3 z-[700] pointer-events-none flex items-center gap-2 px-3 py-1.5"
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

      {/* Top-right Mode Toolbar (Select / Pan / Draw / Erase) */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-[700] flex flex-wrap items-center gap-1 p-1"
        style={{
          backgroundColor: theme.shellBg,
          border: `3px solid ${theme.shellBorder}`,
          boxShadow: pixelShadow(theme.shellBorder, 3),
        }}
      >
        {([
          { id: 'select', label: 'MOVE', icon: <MousePointer className="w-3.5 h-3.5" /> },
          { id: 'pan', label: 'CAMERA', icon: <Hand className="w-3.5 h-3.5" /> },
          { id: 'draw', label: 'DRAW', icon: <Pencil className="w-3.5 h-3.5" /> },
          { id: 'erase', label: 'ERASE', icon: <Eraser className="w-3.5 h-3.5" /> },
        ] as const).map((m) => {
          const active = tool === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setTool(m.id);
                if (m.id !== 'select') {
                  onSelectKey(null);
                  onSelectStickerId(null);
                }
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs cursor-pointer"
              style={{
                fontFamily: '"VT323", monospace',
                backgroundColor: active ? theme.accent : theme.badgeBg,
                color: active ? theme.accentText : theme.textMain,
                border: `2px solid ${theme.shellBorder}`,
              }}
              title={m.label}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom-left Pixel Drawing Palette (when Draw or Erase is active) */}
      {(tool === 'draw' || tool === 'erase') && (
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-3 left-3 z-[700] flex flex-wrap items-center gap-1.5 p-1.5"
          style={{
            backgroundColor: theme.shellBg,
            border: `3px solid ${theme.shellBorder}`,
            boxShadow: pixelShadow(theme.shellBorder, 3),
          }}
        >
          {tool === 'draw' && (
            <>
              <div className="flex items-center gap-1">
                {DRAW_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    className="w-5 h-5 cursor-pointer"
                    style={{
                      backgroundColor: c,
                      border: drawColor === c ? `3px solid ${theme.accent}` : `2px solid ${theme.shellBorder}`,
                    }}
                    title={`Color ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-5 h-5 p-0 border-0 cursor-pointer bg-transparent"
                  title="Custom Pixel Color"
                />
              </div>
              <div className="w-px h-5 bg-white/15 mx-0.5" />
            </>
          )}

          {/* Brush Size */}
          <div className="flex items-center gap-1">
            {([1, 2, 3] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBrushSize(sz)}
                className="px-1.5 py-0.5 text-xs cursor-pointer"
                style={{
                  fontFamily: '"VT323", monospace',
                  backgroundColor: brushSize === sz ? theme.accent : theme.badgeBg,
                  color: brushSize === sz ? theme.accentText : theme.textMain,
                  border: `2px solid ${theme.shellBorder}`,
                }}
                title={`${sz}px brush`}
              >
                {sz}PX
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/15 mx-0.5" />

          <button
            type="button"
            onClick={handleUndoDrawing}
            disabled={undoStack.length === 0}
            className="p-1 cursor-pointer disabled:opacity-35"
            style={{
              backgroundColor: theme.badgeBg,
              color: theme.textMain,
              border: `2px solid ${theme.shellBorder}`,
            }}
            title="Undo Stroke"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClearDrawing}
            className="p-1 cursor-pointer"
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              border: `2px solid ${theme.shellBorder}`,
            }}
            title="Clear Drawing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom-right Camera Zoom & Reset HUD */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 z-[700] flex items-center gap-1 p-1"
        style={{
          backgroundColor: theme.shellBg,
          border: `3px solid ${theme.shellBorder}`,
          boxShadow: pixelShadow(theme.shellBorder, 3),
          color: theme.textMain,
        }}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
          className="p-1 cursor-pointer"
          style={{ backgroundColor: theme.badgeBg, border: `2px solid ${theme.shellBorder}` }}
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span
          className="px-1.5 text-sm min-w-[44px] text-center"
          style={{ fontFamily: '"VT323", monospace' }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))}
          className="p-1 cursor-pointer"
          style={{ backgroundColor: theme.badgeBg, border: `2px solid ${theme.shellBorder}` }}
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button
            type="button"
            onClick={resetCamera}
            className="p-1 cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: theme.accentText,
              border: `2px solid ${theme.shellBorder}`,
            }}
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
