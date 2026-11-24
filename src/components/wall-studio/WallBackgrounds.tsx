import { useMemo } from 'react';
import type { WallBackgroundConfig } from '../../types/wallStudio';
import { createStarterPixelGrid } from '../../lib/wallStudioStore';

interface WallBackgroundLayerProps {
  config: WallBackgroundConfig;
  showWallTrim?: boolean;
}

const WOOD_PALETTES = {
  walnut: {
    base: '#3b2416',
    plankA: '#462b1a',
    plankB: '#331e12',
    seam: '#1a0e07',
    grain: 'rgba(20, 10, 4, 0.35)',
  },
  oak: {
    base: '#7a5230',
    plankA: '#865b36',
    plankB: '#6e4929',
    seam: '#3b2412',
    grain: 'rgba(65, 38, 16, 0.28)',
  },
  birch: {
    base: '#b89b72',
    plankA: '#c3a67c',
    plankB: '#ad8f65',
    seam: '#6b5233',
    grain: 'rgba(110, 84, 52, 0.22)',
  },
};

const MARBLE_PALETTES = {
  carrara: {
    bg: '#eceae4',
    vein1: '#b8b4aa',
    vein2: '#d8d4ca',
  },
  nero: {
    bg: '#14151a',
    vein1: '#3a362d',
    vein2: '#252730',
  },
  emerald: {
    bg: '#0c2620',
    vein1: '#1b4d40',
    vein2: '#2c6b58',
  },
};

export default function WallBackgroundLayer({
  config,
  showWallTrim = true,
}: WallBackgroundLayerProps) {
  const intensity = (config.textureIntensity ?? 80) / 100;

  const pixelGrid = useMemo(() => {
    return config.customPixelGrid && config.customPixelGrid.length === 256
      ? config.customPixelGrid
      : createStarterPixelGrid('stars');
  }, [config.customPixelGrid]);

  const tileSize = config.pixelTileSize ?? 96;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* ── Wood (Pixel Plank Style) ── */}
      {config.preset === 'wood' && (() => {
        const pal = WOOD_PALETTES[config.woodTone ?? 'walnut'];
        return (
          <div className="absolute inset-0" style={{ backgroundColor: pal.base }}>
            <div
              className="absolute inset-0"
              style={{
                opacity: 0.45 + intensity * 0.55,
                backgroundImage: `
                  repeating-linear-gradient(
                    180deg,
                    ${pal.plankA} 0px,
                    ${pal.plankA} 60px,
                    ${pal.seam} 60px,
                    ${pal.seam} 64px,
                    ${pal.plankB} 64px,
                    ${pal.plankB} 124px,
                    ${pal.seam} 124px,
                    ${pal.seam} 128px
                  )
                `,
              }}
            />
            {/* Pixel wood knots & grain dashes */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 + intensity * 0.55 }}>
              <defs>
                <pattern id="pixel-wood-grain" width="64" height="64" patternUnits="userSpaceOnUse">
                  <rect x="4" y="12" width="16" height="4" fill={pal.grain} />
                  <rect x="36" y="24" width="20" height="4" fill={pal.grain} />
                  <rect x="12" y="40" width="12" height="4" fill={pal.grain} />
                  <rect x="44" y="48" width="16" height="4" fill={pal.grain} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pixel-wood-grain)" />
            </svg>
          </div>
        );
      })()}

      {/* ── Cork (Pixel Dithered Pinboard) ── */}
      {config.preset === 'cork' && (
        <div className="absolute inset-0" style={{ backgroundColor: '#a67449' }}>
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.35 + intensity * 0.6 }}>
            <defs>
              <pattern id="pixel-cork" width="32" height="32" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="4" height="4" fill="#8b5a34" />
                <rect x="12" y="4" width="4" height="4" fill="#c28e5c" />
                <rect x="24" y="8" width="4" height="4" fill="#734827" />
                <rect x="8" y="16" width="4" height="4" fill="#c28e5c" />
                <rect x="20" y="20" width="4" height="4" fill="#8b5a34" />
                <rect x="4" y="28" width="4" height="4" fill="#734827" />
                <rect x="28" y="24" width="4" height="4" fill="#c28e5c" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pixel-cork)" />
          </svg>
        </div>
      )}

      {/* ── Marble (Stepped Pixel Veins) ── */}
      {config.preset === 'marble' && (() => {
        const pal = MARBLE_PALETTES[config.marbleTone ?? 'carrara'];
        return (
          <div className="absolute inset-0" style={{ backgroundColor: pal.bg }}>
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 + intensity * 0.6 }}>
              <defs>
                <pattern id="pixel-marble" width="128" height="128" patternUnits="userSpaceOnUse">
                  <rect x="0" y="24" width="24" height="4" fill={pal.vein1} />
                  <rect x="24" y="28" width="16" height="4" fill={pal.vein1} />
                  <rect x="40" y="32" width="24" height="4" fill={pal.vein2} />
                  <rect x="64" y="28" width="20" height="4" fill={pal.vein1} />
                  <rect x="84" y="20" width="28" height="4" fill={pal.vein2} />
                  <rect x="112" y="24" width="16" height="4" fill={pal.vein1} />

                  <rect x="16" y="84" width="20" height="4" fill={pal.vein2} />
                  <rect x="36" y="88" width="28" height="4" fill={pal.vein1} />
                  <rect x="64" y="92" width="24" height="4" fill={pal.vein1} />
                  <rect x="88" y="88" width="20" height="4" fill={pal.vein2} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pixel-marble)" />
            </svg>
          </div>
        );
      })()}

      {/* ── Custom (Color / Gradient / Image / 16x16 Pixel-Art Tile) ── */}
      {config.preset === 'custom' && config.customType === 'pixel-art' && (
        <svg className="absolute inset-0 w-full h-full" shapeRendering="crispEdges">
          <defs>
            <pattern
              id="custom-pixel-tile"
              width={tileSize}
              height={tileSize}
              patternUnits="userSpaceOnUse"
            >
              {pixelGrid.map((color, idx) => {
                const x = idx % 16;
                const y = Math.floor(idx / 16);
                const cell = tileSize / 16;
                return (
                  <rect
                    key={idx}
                    x={x * cell}
                    y={y * cell}
                    width={cell + 0.2}
                    height={cell + 0.2}
                    fill={color}
                  />
                );
              })}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#custom-pixel-tile)" />
        </svg>
      )}

      {config.preset === 'custom' && config.customType !== 'pixel-art' && (
        <div
          className="absolute inset-0 transition-all duration-300"
          style={
            config.customType === 'image' && config.customValue
              ? {
                  backgroundImage: `url(${config.customValue})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : config.customType === 'color'
              ? { backgroundColor: config.customValue || '#18181b' }
              : {
                  background:
                    config.customValue ||
                    'linear-gradient(135deg, #1a1025 0%, #0d1b2a 50%, #1b263b 100%)',
                }
          }
        />
      )}

      {/* ── Lighting Mode Overlay ── */}
      {config.lighting === 'warm' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 25%, rgba(255, 206, 140, 0.16) 0%, transparent 65%)',
          }}
        />
      )}
      {config.lighting === 'cool' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 20%, rgba(125, 211, 252, 0.14) 0%, transparent 65%)',
          }}
        />
      )}
      {config.lighting === 'spotlight' && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0.52) 78%)',
          }}
        />
      )}

      {/* ── Optional Retro CRT Scanlines ── */}
      {config.crtScanlines && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 2px, transparent 2px, transparent 4px)',
          }}
        />
      )}

      {/* ── Vignette ── */}
      {config.vignette && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 90px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* ── Pixel Wall Trim ── */}
      {showWallTrim && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow:
              config.preset === 'cork'
                ? 'inset 0 0 0 8px #5c3a21'
                : 'inset 0 0 0 4px rgba(0,0,0,0.28)',
          }}
        />
      )}
    </div>
  );
}
