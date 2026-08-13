import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

export type PlatformId = 'spotify' | 'apple' | 'youtube' | 'tidal' | 'musicbrainz';

interface PlatformOption {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  bgHover: string;
  border: string;
  getSearchUrl: (album: string, artist: string) => string;
}

export const PLATFORMS: PlatformOption[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🟢',
    color: '#1DB954',
    bgHover: 'hover:bg-[#1DB954]/20',
    border: 'border-[#1DB954]/30',
    getSearchUrl: (album, artist) =>
      `https://open.spotify.com/search/${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'apple',
    name: 'Apple Music',
    icon: '🍎',
    color: '#FA243C',
    bgHover: 'hover:bg-[#FA243C]/20',
    border: 'border-[#FA243C]/30',
    getSearchUrl: (album, artist) =>
      `https://music.apple.com/us/search?term=${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'youtube',
    name: 'YouTube Music',
    icon: '🔴',
    color: '#FF0000',
    bgHover: 'hover:bg-[#FF0000]/20',
    border: 'border-[#FF0000]/30',
    getSearchUrl: (album, artist) =>
      `https://music.youtube.com/search?q=${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'tidal',
    name: 'Tidal',
    icon: '🌊',
    color: '#00FFFF',
    bgHover: 'hover:bg-[#00FFFF]/20',
    border: 'border-[#00FFFF]/30',
    getSearchUrl: (album, artist) =>
      `https://listen.tidal.com/search?q=${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'musicbrainz',
    name: 'MusicBrainz',
    icon: '🛈',
    color: '#BA478F',
    bgHover: 'hover:bg-[#BA478F]/20',
    border: 'border-[#BA478F]/30',
    getSearchUrl: (album, artist) =>
      `https://musicbrainz.org/search?query=${encodeURIComponent(album + ' ' + artist)}&type=release_group`,
  },
];

interface PlatformSelectorProps {
  albumName: string;
  artistName: string;
  currentLink?: string;
  onSelectPlatform?: (platform: PlatformOption, generatedLink: string) => void;
  title?: string;
}

export default function PlatformSelector({
  albumName,
  artistName,
  currentLink = '',
  onSelectPlatform,
  title = 'Where did you listen to this album?',
}: PlatformSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(() => {
    if (!currentLink) return null;
    if (currentLink.includes('spotify.com')) return 'spotify';
    if (currentLink.includes('apple.com')) return 'apple';
    if (currentLink.includes('youtube.com')) return 'youtube';
    if (currentLink.includes('tidal.com')) return 'tidal';
    return null;
  });

  const handlePlatformClick = (platform: PlatformOption) => {
    setSelectedPlatform(platform.id);
    const searchUrl = platform.getSearchUrl(albumName, artistName);

    if (onSelectPlatform) {
      onSelectPlatform(platform, searchUrl);
    }

    // Open link search in new window so user can copy exact album link if desired
    if (albumName.trim() && artistName.trim()) {
      window.open(searchUrl, '_blank');
    }
  };

  return (
    <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
          {title}
        </label>
        <span className="text-[10px] text-white/40">Select platform to search & set link</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handlePlatformClick(platform)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                platform.bgHover
              } ${
                isSelected
                  ? 'bg-white/20 border-white text-white shadow-lg scale-[1.02]'
                  : `bg-white/5 ${platform.border} text-white/80 hover:text-white`
              }`}
            >
              <span>{platform.icon}</span>
              <span className="truncate">{platform.name}</span>
              <ExternalLink className="w-3 h-3 opacity-60 shrink-0 ml-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
