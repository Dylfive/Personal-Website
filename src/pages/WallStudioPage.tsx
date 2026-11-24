import { useState, useEffect, useMemo } from 'react';
import { SlidersHorizontal, FlaskConical, Loader2, X, Star, Calendar, Clock, Disc3, Music, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserAlbums } from '../lib/albumStore';
import type { AlbumEntry } from '../types/album';
import type {
  WallStudioState,
  WallItem,
  WallBackgroundConfig,
  WallCustomizationConfig,
  PixelStickerKind,
  WallSticker,
} from '../types/wallStudio';
import { MAX_WALL_ALBUMS } from '../types/wallStudio';
import {
  getAlbumKey,
  loadWallStudioState,
  saveWallStudioState,
  createGridLayout,
  createScatteredLayout,
  createShelfLayout,
  DEFAULT_BACKGROUND,
  DEFAULT_CUSTOMIZATION,
} from '../lib/wallStudioStore';
import { getPixelTheme, pixelShadow } from '../components/wall-studio/pixelTheme';
import WallCanvas from '../components/wall-studio/WallCanvas';
import CustomizationDrawer from '../components/wall-studio/CustomizationDrawer';
import PixelAlbumBin from '../components/wall-studio/PixelAlbumBin';
import ViewingPlatformButtons from '../components/ViewingPlatformButtons';

export default function WallStudioPage() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [studio, setStudio] = useState<WallStudioState | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [inspectedAlbum, setInspectedAlbum] = useState<AlbumEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await getUserAlbums(user?.id);
      const visible = data.filter((a) => !a.IsHidden);
      if (!cancelled) {
        setAlbums(visible);
        setStudio(loadWallStudioState(user?.id, visible));
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (studio && !loading) {
      saveWallStudioState(user?.id, studio);
    }
  }, [studio, user?.id, loading]);

  const albumMap = useMemo(() => {
    const map = new Map<string, AlbumEntry>();
    albums.forEach((a) => map.set(getAlbumKey(a), a));
    return map;
  }, [albums]);

  const pinnedKeys = useMemo(() => {
    return new Set((studio?.items ?? []).map((it) => it.albumKey));
  }, [studio?.items]);

  const handleChangeBackground = (patch: Partial<WallBackgroundConfig>) => {
    setStudio((prev) =>
      prev ? { ...prev, background: { ...prev.background, ...patch } } : prev
    );
  };

  const handleChangeCustomization = (patch: Partial<WallCustomizationConfig>) => {
    setStudio((prev) =>
      prev ? { ...prev, customization: { ...prev.customization, ...patch } } : prev
    );
  };

  const handleUpdateItem = (key: string, patch: Partial<WallItem>) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.albumKey === key ? { ...it, ...patch } : it)),
      };
    });
  };

  const handleBringForward = (key: string) => {
    setStudio((prev) => {
      if (!prev) return prev;
      const maxZ = prev.items.reduce((m, it) => Math.max(m, it.zIndex), 1);
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.albumKey === key ? { ...it, zIndex: maxZ + 1 } : it
        ),
      };
    });
  };

  const handleSendBackward = (key: string) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.albumKey === key ? { ...it, zIndex: Math.max(1, it.zIndex - 1) } : it
        ),
      };
    });
  };

  const handleRemoveItem = (key: string) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((it) => it.albumKey !== key),
      };
    });
    if (selectedKey === key) setSelectedKey(null);
  };

  const handleAddSticker = (kind: PixelStickerKind) => {
    const id = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setStudio((prev) => {
      if (!prev) return prev;
      const offset = prev.stickers.length * 1.4;
      const newSticker: WallSticker = {
        id,
        kind,
        x: Math.round((50 + Math.cos(offset) * 16) * 10) / 10,
        y: Math.round((50 + Math.sin(offset) * 14) * 10) / 10,
        rotation: 0,
        scale: 1,
        zIndex: 500 + prev.stickers.length,
      };
      return { ...prev, stickers: [...prev.stickers, newSticker] };
    });
    setSelectedKey(null);
    setSelectedStickerId(id);
  };

  const handleUpdateSticker = (id: string, patch: Partial<WallSticker>) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stickers: prev.stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
    });
  };

  const handleRemoveSticker = (id: string) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stickers: prev.stickers.filter((s) => s.id !== id),
      };
    });
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  const handlePinToWall = (album: AlbumEntry) => {
    const key = getAlbumKey(album);
    setStudio((prev) => {
      if (!prev) return prev;
      if (prev.items.length >= MAX_WALL_ALBUMS) return prev;
      if (prev.items.some((it) => it.albumKey === key)) return prev;

      const maxZ = prev.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
      const offsetAngle = prev.items.length * 1.1;
      const x = Math.round((50 + Math.cos(offsetAngle) * 14) * 10) / 10;
      const y = Math.round((50 + Math.sin(offsetAngle) * 12) * 10) / 10;

      const newItem: WallItem = {
        albumKey: key,
        x,
        y,
        rotation: Math.round(Math.sin(offsetAngle) * 6),
        scale: 1,
        zIndex: maxZ + 1,
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
    setSelectedStickerId(null);
    setSelectedKey(key);
  };

  const handleApplyLayout = (layout: 'grid' | 'scatter' | 'shelf') => {
    setStudio((prev) => {
      if (!prev || prev.items.length === 0) return prev;
      if (layout === 'grid') {
        const pinnedAlbums = prev.items
          .map((it) => albumMap.get(it.albumKey))
          .filter((a): a is AlbumEntry => Boolean(a));
        return { ...prev, items: createGridLayout(pinnedAlbums, pinnedAlbums.length) };
      }
      if (layout === 'scatter') {
        return { ...prev, items: createScatteredLayout(prev.items) };
      }
      return { ...prev, items: createShelfLayout(prev.items) };
    });
  };

  const handleClearWall = () => {
    setStudio((prev) => (prev ? { ...prev, items: [], stickers: [] } : prev));
    setSelectedKey(null);
    setSelectedStickerId(null);
  };

  const handleResetWall = () => {
    setStudio({
      items: createGridLayout(albums, Math.min(12, albums.length)),
      stickers: [],
      background: { ...DEFAULT_BACKGROUND },
      customization: { ...DEFAULT_CUSTOMIZATION },
    });
    setSelectedKey(null);
    setSelectedStickerId(null);
  };

  if (loading || !studio) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3 text-white/60">
        <Loader2 className="w-8 h-8 animate-spin text-[color:var(--accent-primary)]" />
        <p className="text-lg" style={{ fontFamily: '"VT323", monospace' }}>
          LOADING WALL STUDIO...
        </p>
      </div>
    );
  }

  const theme = getPixelTheme(
    studio.customization.binTheme,
    studio.customization.binDarkMode
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 pb-20 space-y-6" style={{ imageRendering: 'pixelated' }}>
      {/* ── Pixel-Art Page Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
        style={{
          backgroundColor: theme.shellBg,
          border: `4px solid ${theme.shellBorder}`,
          boxShadow: pixelShadow(theme.shellBorder, 6),
          color: theme.textMain,
        }}
      >
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] mb-2"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              backgroundColor: theme.accent,
              color: theme.accentText,
              border: `2px solid ${theme.shellBorder}`,
            }}
          >
            <FlaskConical className="w-3 h-3" /> PIXEL STUDIO
          </div>
          <h1
            className="text-xl sm:text-2xl tracking-tight leading-snug"
            style={{ fontFamily: '"Press Start 2P", monospace', color: theme.textMain }}
          >
            ALBUM WALL &amp; 3D BIN
          </h1>
          <p
            className="text-lg mt-1"
            style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}
          >
            Curate up to {MAX_WALL_ALBUMS} records, paint custom pixel tiles, place pixel stickers &amp; flip through your crate.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() =>
              handleChangeCustomization({ binDarkMode: !studio.customization.binDarkMode })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] cursor-pointer transition-transform active:translate-y-0.5"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              backgroundColor: theme.badgeBg,
              color: theme.textMain,
              border: `3px solid ${theme.shellBorder}`,
              boxShadow: pixelShadow(theme.shellBorder, 3),
            }}
          >
            {studio.customization.binDarkMode ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
            {studio.customization.binDarkMode ? 'LIGHT' : 'DARK'}
          </button>

          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-[10px] cursor-pointer transition-transform active:translate-y-0.5"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              backgroundColor: theme.btnBg,
              color: theme.textMain,
              border: `3px solid ${theme.shellBorder}`,
              boxShadow: pixelShadow(theme.shellBorder, 3),
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {drawerOpen ? 'HIDE TOOLS' : 'CUSTOMIZE'}
          </button>
        </div>
      </div>

      {/* ── Wall + Customization Drawer Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className={drawerOpen ? 'xl:col-span-9' : 'xl:col-span-12'}>
          <WallCanvas
            items={studio.items}
            stickers={studio.stickers}
            albumMap={albumMap}
            background={studio.background}
            customization={studio.customization}
            theme={theme}
            selectedKey={selectedKey}
            selectedStickerId={selectedStickerId}
            onSelectKey={setSelectedKey}
            onSelectStickerId={setSelectedStickerId}
            onUpdateItem={handleUpdateItem}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onRemoveItem={handleRemoveItem}
            onUpdateSticker={handleUpdateSticker}
            onRemoveSticker={handleRemoveSticker}
          />
        </div>

        {drawerOpen && (
          <div className="xl:col-span-3">
            <CustomizationDrawer
              background={studio.background}
              customization={studio.customization}
              theme={theme}
              onChangeBackground={handleChangeBackground}
              onChangeCustomization={handleChangeCustomization}
              onAddSticker={handleAddSticker}
              onApplyLayout={handleApplyLayout}
              onClearWall={handleClearWall}
              onResetWall={handleResetWall}
            />
          </div>
        )}
      </div>

      {/* ── 3D Pixel-Art Album Bin ── */}
      <PixelAlbumBin
        allAlbums={albums}
        pinnedKeys={pinnedKeys}
        binTheme={studio.customization.binTheme}
        binDarkMode={studio.customization.binDarkMode}
        onToggleDarkMode={() =>
          handleChangeCustomization({ binDarkMode: !studio.customization.binDarkMode })
        }
        onPinToWall={handlePinToWall}
        onUnpinFromWall={handleRemoveItem}
        onInspectAlbum={setInspectedAlbum}
      />

      {/* ── Pixel-Styled Album Inspect Modal ── */}
      {inspectedAlbum && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
          onClick={() => setInspectedAlbum(null)}
        >
          <div
            className="relative w-full max-w-md p-6"
            style={{
              backgroundColor: theme.shellBg,
              border: `4px solid ${theme.shellBorder}`,
              boxShadow: pixelShadow(theme.shellBorder, 8),
              color: theme.textMain,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInspectedAlbum(null)}
              className="absolute top-3 right-3 p-1 cursor-pointer"
              style={{
                backgroundColor: theme.btnBg,
                border: `2px solid ${theme.shellBorder}`,
                color: theme.textMain,
              }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 items-center mb-5">
              <div
                className="w-24 h-24 overflow-hidden bg-zinc-900 flex-shrink-0"
                style={{ border: `3px solid ${theme.shellBorder}` }}
              >
                {inspectedAlbum.CoverArt && inspectedAlbum.CoverArt !== 'Not Found' ? (
                  <img
                    src={inspectedAlbum.CoverArt}
                    alt={String(inspectedAlbum.Album)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-7 h-7 text-white/25" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3
                  className="text-2xl font-bold truncate leading-tight"
                  style={{ fontFamily: '"VT323", monospace', color: theme.textMain }}
                >
                  {String(inspectedAlbum.Album)}
                </h3>
                <p
                  className="text-lg truncate"
                  style={{ fontFamily: '"VT323", monospace', color: theme.textMuted }}
                >
                  {inspectedAlbum.Artist}
                </p>
                <div
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 text-[10px]"
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    backgroundColor: theme.accent,
                    color: theme.accentText,
                    border: `2px solid ${theme.shellBorder}`,
                  }}
                >
                  <Star className="w-3.5 h-3.5" />
                  {inspectedAlbum.Rating.toFixed(1)}
                </div>
              </div>
            </div>

            <div
              className="flex flex-wrap gap-2 mb-5 text-base"
              style={{ fontFamily: '"VT323", monospace' }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5"
                style={{ backgroundColor: theme.badgeBg, border: `2px solid ${theme.shellBorder}` }}
              >
                <Calendar className="w-3.5 h-3.5" /> {inspectedAlbum['Release Year']}
              </span>
              {inspectedAlbum.Length && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5"
                  style={{ backgroundColor: theme.badgeBg, border: `2px solid ${theme.shellBorder}` }}
                >
                  <Clock className="w-3.5 h-3.5" /> {inspectedAlbum.Length}
                </span>
              )}
              {inspectedAlbum.TrackCount ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5"
                  style={{ backgroundColor: theme.badgeBg, border: `2px solid ${theme.shellBorder}` }}
                >
                  <Disc3 className="w-3.5 h-3.5" /> {inspectedAlbum.TrackCount} tracks
                </span>
              ) : null}
            </div>

            <ViewingPlatformButtons
              albumName={String(inspectedAlbum.Album)}
              artistName={inspectedAlbum.Artist}
              appleMusicLink={inspectedAlbum.AppleMusicLink}
            />
          </div>
        </div>
      )}
    </div>
  );
}
