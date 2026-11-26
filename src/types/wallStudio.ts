export type BackgroundPreset = 'wood' | 'cork' | 'marble' | 'custom';

export type CustomBackgroundType = 'color' | 'gradient' | 'image' | 'pixel-art';

export type LightingMode = 'none' | 'warm' | 'cool' | 'spotlight';

export type FrameStyle =
  | 'bare'
  | 'matte'
  | 'polaroid'
  | 'vinyl-peek'
  | 'tape'
  | 'pushpin';

export type ShadowDepth = 'none' | 'soft' | 'deep';

export type BinTheme =
  | 'cupid-pink'
  | 'sky-blue'
  | 'cream-arcade'
  | 'dark-lofi'
  | 'site-theme'
  | 'gameboy-mint'
  | 'neon-cyber'
  | 'sunset-peach';

export type PixelStickerKind =
  | 'star'
  | 'heart'
  | 'note'
  | 'sparkle'
  | 'cassette'
  | 'crown'
  | 'plant'
  | 'moon';

export interface WallSticker {
  id: string;
  kind: PixelStickerKind;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export interface WallItem {
  albumKey: string;
  /** X position as percentage (0–100) of wall canvas width */
  x: number;
  /** Y position as percentage (0–100) of wall canvas height */
  y: number;
  /** Rotation in degrees (-180 to 180) */
  rotation: number;
  /** Scale multiplier (0.65 to 1.5) */
  scale: number;
  /** Stacking order */
  zIndex: number;
  /** Optional per-album frame override */
  frameStyle?: FrameStyle;
}

export interface WallBackgroundConfig {
  preset: BackgroundPreset;
  customType: CustomBackgroundType;
  customValue: string;
  textureIntensity: number; // 0 to 100
  vignette: boolean;
  lighting: LightingMode;
  woodTone?: 'oak' | 'walnut' | 'birch';
  marbleTone?: 'carrara' | 'nero' | 'emerald';
  /** 16x16 pixel grid (256 hex strings) for custom pixel-art tiled background */
  customPixelGrid?: string[];
  /** Display tile size in px for custom pixel-art background */
  pixelTileSize?: number;
  /** Optional retro CRT scanline overlay */
  crtScanlines?: boolean;
}

export interface WallCustomizationConfig {
  globalFrame: FrameStyle;
  shadowDepth: ShadowDepth;
  showRatings: boolean;
  showTitles: boolean;
  snapToGrid: boolean;
  showWallTrim: boolean;
  binTheme: BinTheme;
  binDarkMode: boolean;
  pixelateAlbums?: boolean;
  pixelateStrength?: number;
}

export interface WallStudioState {
  items: WallItem[];
  stickers: WallSticker[];
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
  /** Base64 PNG data URL of the 160x100 pixel-art wall drawing overlay */
  wallDrawingDataUrl?: string;
}

export const MAX_WALL_ALBUMS = 24;
