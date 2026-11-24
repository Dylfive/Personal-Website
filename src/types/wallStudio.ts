export type BackgroundPreset = 'wood' | 'cork' | 'marble' | 'custom';

export type CustomBackgroundType = 'color' | 'gradient' | 'image';

export type LightingMode = 'none' | 'warm' | 'cool' | 'spotlight';

export type FrameStyle =
  | 'bare'
  | 'matte'
  | 'polaroid'
  | 'vinyl-peek'
  | 'tape'
  | 'pushpin';

export type ShadowDepth = 'none' | 'soft' | 'deep';

export type BinTheme = 'cupid-pink' | 'sky-blue' | 'cream-arcade' | 'dark-lofi';

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
}

export interface WallCustomizationConfig {
  globalFrame: FrameStyle;
  shadowDepth: ShadowDepth;
  showRatings: boolean;
  showTitles: boolean;
  snapToGrid: boolean;
  showWallTrim: boolean;
  binTheme: BinTheme;
}

export interface WallStudioState {
  items: WallItem[];
  background: WallBackgroundConfig;
  customization: WallCustomizationConfig;
}

export const MAX_WALL_ALBUMS = 24;
