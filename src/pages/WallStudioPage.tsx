import { useState, useEffect, useMemo } from 'react';
import { SlidersHorizontal, FlaskConical, Loader2, X, Star, Calendar, Clock, Disc3, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserAlbums } from '../lib/albumStore';
import type { AlbumEntry } from '../types/album';
import type {
  WallStudioState,
  WallItem,
  WallBackgroundConfig,
  WallCustomizationConfig,
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
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [inspectedAlbum, setInspectedAlbum] = useState<AlbumEntry | null>(null);

  // Load user's albums & studio state
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

  // Auto-save studio state whenever it changes
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

  const handlePinToWall = (album: AlbumEntry) => {
    const key = getAlbumKey(album);
    setStudio((prev) => {
      if (!prev) return prev;
      if (prev.items.length >= MAX_WALL_ALBUMS) return prev;
      if (prev.items.some((it) => it.albumKey === key)) return prev;

      const maxZ = prev.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
      // Place near center with slight organic offset so multiple pins don't stack identically
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
    setStudio((prev) => (prev ? { ...prev, items: [] } : prev));
    setSelectedKey(null);
  };

  const handleResetWall = () => {
    setStudio({
      items: createGridLayout(albums, Math.min(12, albums.length)),
      background: { ...DEFAULT_BACKGROUND },
      customization: { ...DEFAULT_CUSTOMIZATION },
    });
    setSelectedKey(null);
  };

  if (loading || !studio) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3 text-white/60">
        <Loader2 className="w-8 h-8 animate-spin text-[color:var(--accent-primary)]" />
        <p className="text-sm">Loading your Wall Studio...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 pb-20 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--accent-primary)]/15 border border-[color:var(--accent-primary)]/30 text-[color:var(--accent-primary)] text-[11px] font-bold uppercase tracking-widest mb-2">
            <FlaskConical className="w-3.5 h-3.5" /> Experimental Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            Custom Album Wall &amp; 3D Bin
          </h1>
          <p className="text-sm text-white/55 mt-1">
            Curate up to {MAX_WALL_ALBUMS} records on your custom wall, then flip through the rest of your collection in the pixel crate below.
          </p>
        </div>

        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel border border-white/15 hover:border-[color:var(--accent-primary)]/50 text-sm font-semibold text-white transition-all"
        >
          <SlidersHorizontal className="w-4 h-4 text-[color:var(--accent-primary)]" />
          {drawerOpen ? 'Hide Studio Controls' : 'Customize Wall'}
        </button>
      </div>

      {/* ── Wall + Customization Drawer Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className={drawerOpen ? 'xl:col-span-9' : 'xl:col-span-12'}>
          <WallCanvas
            items={studio.items}
            albumMap={albumMap}
            background={studio.background}
            customization={studio.customization}
            selectedKey={selectedKey}
            onSelectKey={setSelectedKey}
            onUpdateItem={handleUpdateItem}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {drawerOpen && (
          <div className="xl:col-span-3">
            <CustomizationDrawer
              background={studio.background}
              customization={studio.customization}
              onChangeBackground={handleChangeBackground}
              onChangeCustomization={handleChangeCustomization}
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
        onPinToWall={handlePinToWall}
        onUnpinFromWall={handleRemoveItem}
        onInspectAlbum={setInspectedAlbum}
      />

      {/* ── Album Inspect Modal ── */}
      {inspectedAlbum && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setInspectedAlbum(null)}
        >
          <div
            className="relative w-full max-w-md glass-panel bg-[#141418] rounded-2xl p-6 border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInspectedAlbum(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex gap-4 items-center mb-5">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0">
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
                <h3 className="text-xl font-serif font-bold text-white truncate">
                  {String(inspectedAlbum.Album)}
                </h3>
                <p className="text-sm text-white/60 truncate">{inspectedAlbum.Artist}</p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[color:var(--accent-primary)]/20 border border-[color:var(--accent-primary)]/40 text-xs font-bold text-white">
                  <Star className="w-3.5 h-3.5 text-[color:var(--accent-primary)]" />
                  {inspectedAlbum.Rating.toFixed(1)} / 10
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                <Calendar className="w-3.5 h-3.5" /> {inspectedAlbum['Release Year']}
              </span>
              {inspectedAlbum.Length && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  <Clock className="w-3.5 h-3.5" /> {inspectedAlbum.Length}
                </span>
              )}
              {inspectedAlbum.TrackCount ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
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
