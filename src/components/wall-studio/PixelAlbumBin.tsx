import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  Check,
  Search,
  Sparkles,
  Disc3,
  Music,
  Eye,
  Moon,
  Sun,
} from 'lucide-react';
import type { AlbumEntry } from '../../types/album';
import type { BinTheme } from '../../types/wallStudio';
import { MAX_WALL_ALBUMS } from '../../types/wallStudio';
import { getAlbumKey } from '../../lib/wallStudioStore';
import { getPixelTheme, pixelShadow } from './pixelTheme';

interface PixelAlbumBinProps {
  allAlbums: AlbumEntry[];
  pinnedKeys: Set<string>;
  binTheme: BinTheme;
  binDarkMode: boolean;
  onToggleDarkMode: () => void;
  onPinToWall: (album: AlbumEntry) => void;
  onUnpinFromWall: (albumKey: string) => void;
  onInspectAlbum: (album: AlbumEntry) => void;
}

type BinSort = 'rating' | 'year' | 'alpha';

function ratingTierLabel(r: number): string {
  if (r >= 9.5) return 'GRAIL';
  if (r >= 9.0) return 'CLASSIC';
  if (r >= 8.0) return 'GREAT';
  if (r >= 7.0) return 'GOOD';
  if (r >= 5.5) return 'DECENT';
  return 'MEH';
}

export default function PixelAlbumBin({
  allAlbums,
  pinnedKeys,
  binTheme,
  binDarkMode,
  onToggleDarkMode,
  onPinToWall,
  onUnpinFromWall,
  onInspectAlbum,
}: PixelAlbumBinProps) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<BinSort>('rating');
  const [activeIndex, setActiveIndex] = useState(0);

  const t = getPixelTheme(binTheme, binDarkMode);
  const wallFull = pinnedKeys.size >= MAX_WALL_ALBUMS;

  const binAlbums = useMemo(() => {
    let list = showAll
      ? allAlbums
      : allAlbums.filter((a) => !pinnedKeys.has(getAlbumKey(a)));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          String(a.Album).toLowerCase().includes(q) ||
          a.Artist.toLowerCase().includes(q) ||
          a.Genre.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === 'rating') sorted.sort((a, b) => b.Rating - a.Rating);
    else if (sortBy === 'year') sorted.sort((a, b) => b['Release Year'] - a['Release Year']);
    else sorted.sort((a, b) => String(a.Album).localeCompare(String(b.Album)));

    return sorted;
  }, [allAlbums, pinnedKeys, showAll, search, sortBy]);

  const safeIndex = binAlbums.length === 0 ? 0 : Math.min(activeIndex, binAlbums.length - 1);

  const stepPrev = () => {
    if (binAlbums.length === 0) return;
    setActiveIndex(Math.max(0, safeIndex - 1));
  };

  const stepNext = () => {
    if (binAlbums.length === 0) return;
    setActiveIndex(Math.min(binAlbums.length - 1, safeIndex + 1));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return;
    if (e.deltaY > 0 || e.deltaX > 0) stepNext();
    else stepPrev();
  };

  const activeAlbum = binAlbums[safeIndex] ?? null;
  const activeKey = activeAlbum ? getAlbumKey(activeAlbum) : '';
  const activeIsPinned = activeKey ? pinnedKeys.has(activeKey) : false;

  const visibleSlice = useMemo(() => {
    const items: { album: AlbumEntry; index: number; offset: number }[] = [];
    for (let offset = -2; offset <= 5; offset++) {
      const idx = safeIndex + offset;
      if (idx >= 0 && idx < binAlbums.length) {
        items.push({ album: binAlbums[idx], index: idx, offset });
      }
    }
    return items;
  }, [binAlbums, safeIndex]);

  const filledStars = activeAlbum ? Math.round(activeAlbum.Rating / 2) : 0;

  return (
    <div
      className="relative rounded-none p-4 sm:p-5 transition-colors duration-300"
      style={{
        backgroundColor: t.shellBg,
        border: `4px solid ${t.shellBorder}`,
        boxShadow: pixelShadow(t.shellBorder, 6),
        color: t.textMain,
        imageRendering: 'pixelated',
      }}
    >
      {/* ── Pixel Header Bar ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b-4"
        style={{ borderColor: t.shellBorder }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{
              backgroundColor: t.accent,
              color: t.accentText,
              border: `3px solid ${t.shellBorder}`,
              boxShadow: pixelShadow(t.shellBorder, 2),
            }}
          >
            <Disc3 className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-xs sm:text-sm tracking-tight leading-none"
              style={{ fontFamily: '"Press Start 2P", monospace' }}
            >
              RECORD BIN
            </h2>
            <p
              className="text-sm sm:text-base leading-none mt-1"
              style={{ fontFamily: '"VT323", monospace', color: t.textMuted }}
            >
              {binAlbums.length} {showAll ? 'total' : 'unpinned'} sleeves • flip with arrows or scroll
            </p>
          </div>
        </div>

        {/* Filter, Search & Dark Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1"
            style={{
              backgroundColor: t.badgeBg,
              border: `2px solid ${t.shellBorder}`,
            }}
          >
            <Search className="w-3.5 h-3.5 opacity-60" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search bin..."
              className="bg-transparent text-sm w-28 sm:w-36 focus:outline-none"
              style={{ fontFamily: '"VT323", monospace', color: t.textMain }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as BinSort);
              setActiveIndex(0);
            }}
            className="px-2 py-1 text-sm cursor-pointer focus:outline-none"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: t.badgeBg,
              border: `2px solid ${t.shellBorder}`,
              color: t.textMain,
            }}
          >
            <option value="rating">SORT: RATING</option>
            <option value="year">SORT: YEAR</option>
            <option value="alpha">SORT: A → Z</option>
          </select>

          <button
            onClick={() => {
              setShowAll((v) => !v);
              setActiveIndex(0);
            }}
            className="px-2.5 py-1 text-sm font-bold cursor-pointer transition-transform active:translate-y-0.5"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: showAll ? t.accent : t.btnBg,
              color: showAll ? t.accentText : t.textMain,
              border: `2px solid ${t.shellBorder}`,
              boxShadow: pixelShadow(t.shellBorder, 2),
            }}
          >
            {showAll ? 'ALL ALBUMS' : 'UNPINNED ONLY'}
          </button>

          {/* Dark / Light Mode Toggle for Bin & Studio */}
          <button
            onClick={onToggleDarkMode}
            title={binDarkMode ? 'Switch to Light Pastel Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1 px-2.5 py-1 text-sm font-bold cursor-pointer transition-transform active:translate-y-0.5"
            style={{
              fontFamily: '"VT323", monospace',
              backgroundColor: t.btnBg,
              color: t.textMain,
              border: `2px solid ${t.shellBorder}`,
              boxShadow: pixelShadow(t.shellBorder, 2),
            }}
          >
            {binDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {binDarkMode ? 'LIGHT' : 'DARK'}
          </button>
        </div>
      </div>

      {/* ── Main 3D Crate Stage ── */}
      {binAlbums.length === 0 ? (
        <div
          className="py-14 text-center border-4 border-dashed"
          style={{ borderColor: t.shellBorder, backgroundColor: t.badgeBg }}
        >
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-60" />
          <p className="text-xs" style={{ fontFamily: '"Press Start 2P", monospace' }}>
            BIN IS EMPTY!
          </p>
          <p
            className="text-lg mt-2"
            style={{ fontFamily: '"VT323", monospace', color: t.textMuted }}
          >
            {search
              ? 'No matching records found.'
              : 'All your albums are pinned or hidden. Toggle "ALL ALBUMS" to browse everything.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left/Center: 3D Perspective Crate */}
          <div
            className="lg:col-span-7 relative flex flex-col items-center pt-14 pb-4 select-none"
            onWheel={handleWheel}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepPrev();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepNext();
              }
            }}
          >
            {/* ── FLOATING RATING BADGE ABOVE THE BIN ── */}
            {activeAlbum && (
              <div
                key={`rating-${activeKey}`}
                className="pixel-float-bob relative z-40 mb-3 flex items-center gap-2.5 px-3.5 py-2"
                style={{
                  backgroundColor: t.badgeBg,
                  border: `3px solid ${t.shellBorder}`,
                  boxShadow: pixelShadow(t.shellBorder, 4),
                }}
              >
                <div
                  className="px-2 py-1 text-xs leading-none"
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    backgroundColor: t.accent,
                    color: t.accentText,
                    border: `2px solid ${t.shellBorder}`,
                  }}
                >
                  {activeAlbum.Rating.toFixed(1)}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-0.5 text-sm leading-none">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          color: i < filledStars ? t.starColor : t.textMuted,
                          opacity: i < filledStars ? 1 : 0.3,
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span
                    className="text-xs leading-none mt-1 tracking-wider"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: '8px',
                      color: t.textMuted,
                    }}
                  >
                    {ratingTierLabel(activeAlbum.Rating)}
                  </span>
                </div>
                <div
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                  style={{
                    backgroundColor: t.badgeBg,
                    borderRight: `3px solid ${t.shellBorder}`,
                    borderBottom: `3px solid ${t.shellBorder}`,
                  }}
                />
              </div>
            )}

            {/* ── 3D Record Crate Container ── */}
            <div
              className="relative w-full max-w-[360px] h-[270px] flex items-end justify-center"
              style={{ perspective: '1100px' }}
            >
              <div
                className="absolute bottom-2 w-[310px] h-[195px]"
                style={{
                  backgroundColor: t.crateInner,
                  border: `4px solid ${t.shellBorder}`,
                  boxShadow: 'inset 0 18px 36px rgba(0,0,0,0.65)',
                }}
              />

              <div
                className="relative w-[196px] h-[196px] mb-9"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {visibleSlice.map(({ album, index, offset }) => {
                  const key = getAlbumKey(album);
                  const hasCover = album.CoverArt && album.CoverArt !== 'Not Found';
                  const isActive = offset === 0;
                  const isFlippedPast = offset < 0;

                  let transform: string;
                  let opacity = 1;
                  let zIdx: number;

                  if (isActive) {
                    transform = 'translateZ(38px) translateY(-10px) rotateX(-4deg)';
                    zIdx = 50;
                  } else if (isFlippedPast) {
                    const abs = Math.abs(offset);
                    transform = `translateZ(${64 + abs * 14}px) translateY(${44 + abs * 10}px) rotateX(-68deg)`;
                    opacity = abs === 1 ? 0.88 : 0.45;
                    zIdx = 55 + abs;
                  } else {
                    transform = `translateZ(${-offset * 34}px) translateY(${-offset * 15}px) rotateX(-16deg)`;
                    opacity = Math.max(0.38, 1 - offset * 0.13);
                    zIdx = 30 - offset;
                  }

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        if (!isActive) {
                          setActiveIndex(index);
                        } else {
                          onInspectAlbum(album);
                        }
                      }}
                      style={{
                        transform,
                        opacity,
                        zIndex: zIdx,
                        transition:
                          'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease',
                        border: `3px solid ${t.shellBorder}`,
                        boxShadow: isActive
                          ? `0 14px 28px rgba(0,0,0,0.45), 0 0 0 3px ${t.accent}`
                          : '0 6px 14px rgba(0,0,0,0.4)',
                      }}
                      className="absolute inset-0 bg-zinc-900 cursor-pointer overflow-hidden"
                      title={
                        isActive ? 'Click to inspect album' : `Flip to ${String(album.Album)}`
                      }
                    >
                      {hasCover ? (
                        <img
                          src={album.CoverArt}
                          alt={String(album.Album)}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <Music className="w-10 h-10 text-white/30" />
                        </div>
                      )}

                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/25" />

                      {pinnedKeys.has(key) && (
                        <div
                          className="absolute top-2 left-2 px-1.5 py-0.5 text-[8px] flex items-center gap-1"
                          style={{
                            fontFamily: '"Press Start 2P", monospace',
                            backgroundColor: t.accent,
                            color: t.accentText,
                            border: `2px solid ${t.shellBorder}`,
                          }}
                        >
                          <Pin className="w-2.5 h-2.5" /> ON WALL
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Crate Front Lip */}
              <div
                className="absolute bottom-0 w-[332px] h-[68px] z-[70] flex flex-col items-center justify-center pointer-events-none"
                style={{
                  backgroundColor: t.crateFront,
                  border: `4px solid ${t.shellBorder}`,
                  boxShadow: pixelShadow(t.shellBorder, 5),
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-3 border-b-4"
                  style={{ backgroundColor: t.crateLip, borderColor: t.shellBorder }}
                />
                <div
                  className="mt-2 px-4 py-1"
                  style={{
                    backgroundColor: t.badgeBg,
                    border: `2px solid ${t.shellBorder}`,
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '9px',
                    color: t.textMain,
                  }}
                >
                  {safeIndex + 1} / {binAlbums.length}
                </div>
              </div>
            </div>

            {/* ── Prev / Next Pixel Controls ── */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={stepPrev}
                disabled={safeIndex <= 0}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] disabled:opacity-40 cursor-pointer transition-transform active:translate-y-0.5"
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  backgroundColor: t.btnBg,
                  border: `3px solid ${t.shellBorder}`,
                  boxShadow: pixelShadow(t.shellBorder, 3),
                  color: t.textMain,
                }}
              >
                <ChevronLeft className="w-4 h-4" /> PREV
              </button>

              <button
                onClick={stepNext}
                disabled={safeIndex >= binAlbums.length - 1}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] disabled:opacity-40 cursor-pointer transition-transform active:translate-y-0.5"
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  backgroundColor: t.btnBg,
                  border: `3px solid ${t.shellBorder}`,
                  boxShadow: pixelShadow(t.shellBorder, 3),
                  color: t.textMain,
                }}
              >
                NEXT <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Active Record Info & Actions Plaque */}
          {activeAlbum && (
            <div
              className="lg:col-span-5 p-4 space-y-4"
              style={{
                backgroundColor: t.badgeBg,
                border: `4px solid ${t.shellBorder}`,
                boxShadow: pixelShadow(t.shellBorder, 4),
              }}
            >
              <div>
                <span
                  className="inline-block px-2 py-0.5 text-[9px] mb-2"
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    backgroundColor: t.crateFront,
                    border: `2px solid ${t.shellBorder}`,
                    color: t.textMain,
                  }}
                >
                  NOW BROWSING
                </span>
                <h3
                  className="text-2xl sm:text-3xl font-bold leading-tight break-words"
                  style={{ fontFamily: '"VT323", monospace', color: t.textMain }}
                >
                  {String(activeAlbum.Album)}
                </h3>
                <p
                  className="text-xl leading-tight"
                  style={{ fontFamily: '"VT323", monospace', color: t.textMuted }}
                >
                  by {activeAlbum.Artist}
                </p>
              </div>

              <div
                className="grid grid-cols-3 gap-2 py-2 border-y-2 text-center"
                style={{ borderColor: t.shellBorder, fontFamily: '"VT323", monospace' }}
              >
                <div>
                  <div className="text-xs opacity-60">YEAR</div>
                  <div className="text-lg font-bold">{activeAlbum['Release Year']}</div>
                </div>
                <div>
                  <div className="text-xs opacity-60">LENGTH</div>
                  <div className="text-lg font-bold">{activeAlbum.Length || '—'}</div>
                </div>
                <div>
                  <div className="text-xs opacity-60">GENRE</div>
                  <div className="text-lg font-bold truncate px-1">
                    {activeAlbum.Genre?.split(',')[0]?.trim() || '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {activeIsPinned ? (
                  <button
                    onClick={() => onUnpinFromWall(activeKey)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] cursor-pointer transition-transform active:translate-y-0.5"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      backgroundColor: t.btnBg,
                      color: t.textMain,
                      border: `3px solid ${t.shellBorder}`,
                      boxShadow: pixelShadow(t.shellBorder, 3),
                    }}
                  >
                    <Check className="w-3.5 h-3.5" /> UNPIN
                  </button>
                ) : (
                  <button
                    onClick={() => onPinToWall(activeAlbum)}
                    disabled={wallFull}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] disabled:opacity-50 cursor-pointer transition-transform active:translate-y-0.5"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      backgroundColor: t.accent,
                      color: t.accentText,
                      border: `3px solid ${t.shellBorder}`,
                      boxShadow: pixelShadow(t.shellBorder, 3),
                    }}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {wallFull ? 'WALL FULL (24)' : 'PIN TO WALL'}
                  </button>
                )}

                <button
                  onClick={() => onInspectAlbum(activeAlbum)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] cursor-pointer transition-transform active:translate-y-0.5"
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    backgroundColor: t.shellBg,
                    color: t.textMain,
                    border: `3px solid ${t.shellBorder}`,
                    boxShadow: pixelShadow(t.shellBorder, 3),
                  }}
                >
                  <Eye className="w-3.5 h-3.5" /> INFO
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
