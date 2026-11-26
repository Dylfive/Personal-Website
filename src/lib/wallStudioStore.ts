import type { AlbumEntry } from '../types/album';
import type {
  WallStudioState,
  WallItem,
  WallBackgroundConfig,
  WallCustomizationConfig,
} from '../types/wallStudio';
import { MAX_WALL_ALBUMS } from '../types/wallStudio';

export function getAlbumKey(album: AlbumEntry): string {
  return `${String(album.Album).trim()}::${album.Artist.trim()}`;
}

export function createStarterPixelGrid(preset: 'stars' | 'checker' | 'hearts' | 'empty' = 'stars'): string[] {
  const grid = Array(256).fill('#1b1024');
  if (preset === 'empty') return Array(256).fill('#181825');
  if (preset === 'checker') {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const isA = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
        grid[y * 16 + x] = isA ? '#2a1b3d' : '#1b1128';
      }
    }
    return grid;
  }
  if (preset === 'hearts') {
    const bg = '#2b1623';
    const fg = '#ff4d79';
    const hi = '#ffb3c6';
    grid.fill(bg);
    const pts: [number, number, string][] = [
      [5, 5, fg], [6, 5, fg], [9, 5, fg], [10, 5, fg],
      [4, 6, fg], [5, 6, hi], [6, 6, fg], [7, 6, fg], [8, 6, fg], [9, 6, fg], [10, 6, fg], [11, 6, fg],
      [4, 7, fg], [5, 7, fg], [6, 7, fg], [7, 7, fg], [8, 7, fg], [9, 7, fg], [10, 7, fg], [11, 7, fg],
      [5, 8, fg], [6, 8, fg], [7, 8, fg], [8, 8, fg], [9, 8, fg], [10, 8, fg],
      [6, 9, fg], [7, 9, fg], [8, 9, fg], [9, 9, fg],
      [7, 10, fg], [8, 10, fg],
    ];
    pts.forEach(([x, y, c]) => { grid[y * 16 + x] = c; });
    return grid;
  }
  // 'stars'
  const starPts: [number, number, string][] = [
    [3, 3, '#ffd166'], [3, 2, '#fff3b0'], [3, 4, '#fff3b0'], [2, 3, '#fff3b0'], [4, 3, '#fff3b0'],
    [11, 6, '#ff8fab'],
    [12, 11, '#7cc6fe'], [12, 10, '#e0f2fe'], [12, 12, '#e0f2fe'], [11, 11, '#e0f2fe'], [13, 11, '#e0f2fe'],
    [5, 13, '#c4b5fd'],
  ];
  starPts.forEach(([x, y, c]) => { grid[y * 16 + x] = c; });
  return grid;
}

export const DEFAULT_BACKGROUND: WallBackgroundConfig = {
  preset: 'wood',
  customType: 'pixel-art',
  customValue: 'linear-gradient(135deg, #1a1025 0%, #0d1b2a 50%, #1b263b 100%)',
  textureIntensity: 80,
  vignette: true,
  lighting: 'warm',
  woodTone: 'walnut',
  marbleTone: 'carrara',
  customPixelGrid: createStarterPixelGrid('stars'),
  pixelTileSize: 96,
  crtScanlines: false,
};

export const DEFAULT_CUSTOMIZATION: WallCustomizationConfig = {
  globalFrame: 'matte',
  shadowDepth: 'deep',
  showRatings: true,
  showTitles: false,
  snapToGrid: false,
  showWallTrim: true,
  binTheme: 'cupid-pink',
  binDarkMode: true,
  pixelateAlbums: false,
};

export function createGridLayout(albums: AlbumEntry[], count = 12): WallItem[] {
  const slice = albums.slice(0, Math.min(count, MAX_WALL_ALBUMS));
  const cols =
    slice.length <= 1
      ? 1
      : slice.length <= 4
      ? 2
      : slice.length <= 9
      ? 3
      : slice.length <= 16
      ? 4
      : 6;
  const rows = Math.ceil(slice.length / cols);

  return slice.map((album, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const xSpacing = 76 / Math.max(cols - 1, 1);
    const ySpacing = 72 / Math.max(rows - 1, 1);
    const x = cols === 1 ? 50 : 12 + col * xSpacing;
    const y = rows === 1 ? 50 : 14 + row * ySpacing;

    return {
      albumKey: getAlbumKey(album),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      rotation: 0,
      scale: slice.length > 16 ? 0.85 : 1,
      zIndex: idx + 1,
    };
  });
}

export function createScatteredLayout(items: WallItem[]): WallItem[] {
  return items.map((item, idx) => {
    const seed = idx * 137.5;
    const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(items.length))));
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const baseX = 14 + (col / Math.max(cols - 1, 1)) * 72;
    const baseY = 16 + (row / Math.max(Math.ceil(items.length / cols) - 1, 1)) * 68;
    const jitterX = Math.sin(seed) * 4.5;
    const jitterY = Math.cos(seed * 1.3) * 4.5;
    const rot = Math.round(Math.sin(seed * 2.1) * 14);

    return {
      ...item,
      x: Math.max(8, Math.min(92, Math.round((baseX + jitterX) * 10) / 10)),
      y: Math.max(10, Math.min(90, Math.round((baseY + jitterY) * 10) / 10)),
      rotation: rot,
      zIndex: idx + 1,
    };
  });
}

export function createShelfLayout(items: WallItem[]): WallItem[] {
  const perRow = Math.min(6, Math.max(4, Math.ceil(items.length / 3)));
  const rows = Math.ceil(items.length / perRow);
  return items.map((item, idx) => {
    const row = Math.floor(idx / perRow);
    const col = idx % perRow;
    const x = perRow === 1 ? 50 : 11 + (col / Math.max(perRow - 1, 1)) * 78;
    const y = rows === 1 ? 50 : 18 + (row / Math.max(rows - 1, 1)) * 64;
    return {
      ...item,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      rotation: 0,
      scale: items.length > 16 ? 0.85 : 0.95,
      zIndex: idx + 1,
    };
  });
}

function storageKey(userId?: string): string {
  return `wall_studio_v1_${userId || 'guest'}`;
}

export function loadWallStudioState(
  userId: string | undefined,
  albums: AlbumEntry[]
): WallStudioState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WallStudioState>;
      const validKeys = new Set(albums.map(getAlbumKey));
      const items = (parsed.items ?? [])
        .filter((it) => validKeys.has(it.albumKey))
        .slice(0, MAX_WALL_ALBUMS);

      return {
        items,
        stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
        background: { ...DEFAULT_BACKGROUND, ...(parsed.background ?? {}) },
        customization: { ...DEFAULT_CUSTOMIZATION, ...(parsed.customization ?? {}) },
        wallDrawingDataUrl: typeof parsed.wallDrawingDataUrl === 'string' ? parsed.wallDrawingDataUrl : undefined,
      };
    }
  } catch {
    // ignore malformed storage
  }

  return {
    items: createGridLayout(albums, Math.min(12, albums.length)),
    stickers: [],
    background: { ...DEFAULT_BACKGROUND },
    customization: { ...DEFAULT_CUSTOMIZATION },
  };
}

export function saveWallStudioState(
  userId: string | undefined,
  state: WallStudioState
): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
