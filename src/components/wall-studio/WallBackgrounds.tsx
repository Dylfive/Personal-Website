import type { WallBackgroundConfig } from '../../types/wallStudio';

interface WallBackgroundLayerProps {
  config: WallBackgroundConfig;
  showWallTrim?: boolean;
}

const WOOD_PALETTES = {
  walnut: {
    base: '#3b2416',
    plankA: '#462b1a',
    plankB: '#331e12',
    seam: 'rgba(14, 7, 3, 0.55)',
    grain: 'rgba(20, 10, 4, 0.28)',
    highlight: 'rgba(255, 200, 145, 0.06)',
  },
  oak: {
    base: '#7a5230',
    plankA: '#865b36',
    plankB: '#6e4929',
    seam: 'rgba(42, 24, 10, 0.45)',
    grain: 'rgba(65, 38, 16, 0.22)',
    highlight: 'rgba(255, 228, 185, 0.09)',
  },
  birch: {
    base: '#b89b72',
    plankA: '#c3a67c',
    plankB: '#ad8f65',
    seam: 'rgba(84, 63, 38, 0.35)',
    grain: 'rgba(110, 84, 52, 0.16)',
    highlight: 'rgba(255, 248, 232, 0.12)',
  },
};

const MARBLE_PALETTES = {
  carrara: {
    bg: 'linear-gradient(135deg, #eceae4 0%, #dcd8cf 45%, #f3f1ec 100%)',
    vein1: 'rgba(115, 118, 128, 0.26)',
    vein2: 'rgba(165, 160, 152, 0.18)',
  },
  nero: {
    bg: 'linear-gradient(135deg, #121317 0%, #1c1e24 50%, #0d0e11 100%)',
    vein1: 'rgba(226, 204, 156, 0.24)',
    vein2: 'rgba(255, 255, 255, 0.12)',
  },
  emerald: {
    bg: 'linear-gradient(135deg, #0b241e 0%, #11362d 50%, #071915 100%)',
    vein1: 'rgba(180, 235, 210, 0.2)',
    vein2: 'rgba(232, 204, 138, 0.16)',
  },
};

export default function WallBackgroundLayer({
  config,
  showWallTrim = true,
}: WallBackgroundLayerProps) {
  const intensity = (config.textureIntensity ?? 80) / 100;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* ── Base Surface ── */}
      {config.preset === 'wood' && (() => {
        const pal = WOOD_PALETTES[config.woodTone ?? 'walnut'];
        return (
          <div className="absolute inset-0" style={{ backgroundColor: pal.base }}>
            {/* Horizontal wood planks */}
            <div
              className="absolute inset-0"
              style={{
                opacity: 0.4 + intensity * 0.6,
                backgroundImage: `
                  repeating-linear-gradient(
                    180deg,
                    ${pal.plankA} 0px,
                    ${pal.plankA} 76px,
                    ${pal.seam} 76px,
                    ${pal.seam} 79px,
                    ${pal.plankB} 79px,
                    ${pal.plankB} 156px,
                    ${pal.seam} 156px,
                    ${pal.seam} 159px
                  )
                `,
              }}
            />
            {/* Wood grain SVG overlay */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ opacity: 0.35 + intensity * 0.5 }}
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="wood-grain-filter" x="0%" y="0%" width="100%" height="100%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.012 0.18"
                    numOctaves="4"
                    seed="7"
                  />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0.08  0 0 0 0 0.04  0 0 0 0 0.01  0 0 0 0.42 0"
                  />
                </filter>
              </defs>
              <rect width="100%" height="100%" filter="url(#wood-grain-filter)" />
            </svg>
            {/* Subtle satin sheen */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(120deg, ${pal.highlight} 0%, transparent 45%, ${pal.grain} 100%)`,
              }}
            />
          </div>
        );
      })()}

      {config.preset === 'cork' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#a67449',
            backgroundImage: `
              radial-gradient(circle at 22% 30%, rgba(196, 145, 96, 0.45), transparent 55%),
              radial-gradient(circle at 78% 72%, rgba(92, 56, 28, 0.45), transparent 60%)
            `,
          }}
        >
          {/* Cork speckle SVG */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.4 + intensity * 0.55 }}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="cork-noise" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.65"
                  numOctaves="3"
                  seed="19"
                />
                <feColorMatrix
                  type="matrix"
                  values="0.35 0 0 0 0.25  0.22 0 0 0 0.14  0.1 0 0 0 0.06  0 0 0 0.55 0"
                />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#cork-noise)" />
          </svg>
          {/* Subtle pinboard grid dots */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(rgba(45,25,10,0.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>
      )}

      {config.preset === 'marble' && (() => {
        const pal = MARBLE_PALETTES[config.marbleTone ?? 'carrara'];
        return (
          <div className="absolute inset-0" style={{ background: pal.bg }}>
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1200 800"
              preserveAspectRatio="none"
              style={{ opacity: 0.35 + intensity * 0.65 }}
            >
              <defs>
                <filter id="marble-vein-blur">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.008"
                    numOctaves="5"
                    seed="12"
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="55"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              </defs>
              <g filter="url(#marble-vein-blur)" fill="none" strokeLinecap="round">
                <path d="M-50 120 Q 320 260 640 140 T 1260 280" stroke={pal.vein1} strokeWidth="6" />
                <path d="M-40 420 Q 280 310 590 480 T 1240 390" stroke={pal.vein1} strokeWidth="4" />
                <path d="M120 -20 Q 420 280 360 560 T 720 840" stroke={pal.vein2} strokeWidth="3.5" />
                <path d="M780 -30 Q 650 260 920 510 T 1100 830" stroke={pal.vein1} strokeWidth="2.5" />
                <path d="M-20 670 Q 440 590 820 710 T 1250 620" stroke={pal.vein2} strokeWidth="3" />
              </g>
            </svg>
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)',
              }}
            />
          </div>
        );
      })()}

      {config.preset === 'custom' && (
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

      {/* ── Vignette ── */}
      {config.vignette && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 110px rgba(0, 0, 0, 0.55)',
          }}
        />
      )}

      {/* ── Wall Trim / Frame ── */}
      {showWallTrim && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              config.preset === 'cork'
                ? 'inset 0 0 0 8px #5c3a21, inset 0 0 18px rgba(0,0,0,0.55)'
                : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        />
      )}
    </div>
  );
}
