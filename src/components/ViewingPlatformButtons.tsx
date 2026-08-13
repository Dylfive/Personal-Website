export interface ViewingPlatformButtonsProps {
  albumName: string;
  artistName: string;
  appleMusicLink?: string;
}

export const VIEWING_PLATFORMS = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🟢',
    bgHover: 'hover:bg-[#1DB954]/20 hover:border-[#1DB954]/40 hover:text-white',
    border: 'border-[#1DB954]/30',
    getUrl: (album: string, artist: string) =>
      `https://open.spotify.com/search/${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'apple',
    name: 'Apple Music',
    icon: '🍎',
    bgHover: 'hover:bg-[#FA243C]/20 hover:border-[#FA243C]/40 hover:text-white',
    border: 'border-[#FA243C]/30',
    getUrl: (album: string, artist: string, fallbackLink?: string) =>
      fallbackLink || `https://music.apple.com/us/search?term=${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'youtube',
    name: 'YT Music',
    icon: '🔴',
    bgHover: 'hover:bg-[#FF0000]/20 hover:border-[#FF0000]/40 hover:text-white',
    border: 'border-[#FF0000]/30',
    getUrl: (album: string, artist: string) =>
      `https://music.youtube.com/search?q=${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'tidal',
    name: 'Tidal',
    icon: '🌊',
    bgHover: 'hover:bg-[#00FFFF]/20 hover:border-[#00FFFF]/40 hover:text-white',
    border: 'border-[#00FFFF]/30',
    getUrl: (album: string, artist: string) =>
      `https://listen.tidal.com/search?q=${encodeURIComponent(`${album} ${artist}`)}`,
  },
  {
    id: 'musicbrainz',
    name: 'MusicBrainz',
    icon: '🛈',
    bgHover: 'hover:bg-[#BA478F]/20 hover:border-[#BA478F]/40 hover:text-white',
    border: 'border-[#BA478F]/30',
    getUrl: (album: string, artist: string) =>
      `https://musicbrainz.org/search?query=${encodeURIComponent(`${album} ${artist}`)}&type=release_group`,
  },
];

export default function ViewingPlatformButtons({
  albumName,
  artistName,
  appleMusicLink,
}: ViewingPlatformButtonsProps) {
  return (
    <div className="space-y-2 mb-6">
      <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
        Listen On
      </div>
      <div className="flex flex-wrap gap-2">
        {VIEWING_PLATFORMS.map((platform) => {
          const url = platform.getUrl(albumName, artistName, appleMusicLink);
          return (
            <a
              key={platform.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 min-w-[95px] sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border bg-white/5 text-white/70 text-xs font-semibold transition-all ${platform.border} ${platform.bgHover}`}
            >
              <span className="text-sm">{platform.icon}</span>
              <span className="whitespace-nowrap">{platform.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
