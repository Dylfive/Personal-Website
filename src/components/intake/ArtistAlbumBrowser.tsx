import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Disc3,
  Star,
  X,
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  type ItunesArtist,
  type ItunesAlbum,
  searchItunesArtists,
  fetchArtistAlbums,
  upgradeArtworkUrl,
  isSingleOrEp,
} from '../../lib/itunes';
import type { AlbumEntry } from '../../types/album';
import RatingInput from './RatingInput';

interface ArtistAlbumBrowserProps {
  existingAlbums: AlbumEntry[];
  onSelectAlbum: (album: ItunesAlbum, rating: number) => void;
}

export default function ArtistAlbumBrowser({
  existingAlbums,
  onSelectAlbum,
}: ArtistAlbumBrowserProps) {
  const [query, setQuery] = useState('');
  const [artists, setArtists] = useState<ItunesArtist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<ItunesArtist | null>(null);
  const [albums, setAlbums] = useState<ItunesAlbum[]>([]);
  const [showSingles, setShowSingles] = useState(false);

  const [isSearchingArtists, setIsSearchingArtists] = useState(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected album waiting for a rating
  const [pickedAlbum, setPickedAlbum] = useState<ItunesAlbum | null>(null);
  const [rating, setRating] = useState('');
  const [ratingError, setRatingError] = useState<string | null>(null);

  // Map normalized album title -> existing entry for quick "Already on wall" badges
  const existingMap = useMemo(() => {
    const map = new Map<string, AlbumEntry>();
    for (const entry of existingAlbums) {
      const key = String(entry.Album).toLowerCase().trim();
      if (!map.has(key)) map.set(key, entry);
    }
    return map;
  }, [existingAlbums]);

  // Debounced artist search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingArtists(true);
      setError(null);
      try {
        const found = await searchItunesArtists(trimmed, controller.signal);
        setArtists(found);
        setSelectedArtist(found[0] ?? null);
        if (found.length === 0) {
          setAlbums([]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to search artists.');
        setArtists([]);
        setSelectedArtist(null);
        setAlbums([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingArtists(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Fetch discography whenever selectedArtist changes
  useEffect(() => {
    if (!selectedArtist) return;

    const controller = new AbortController();
    const loadDiscography = async () => {
      setIsLoadingAlbums(true);
      setError(null);
      try {
        const discography = await fetchArtistAlbums(
          selectedArtist.artistId,
          controller.signal
        );
        setAlbums(discography);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load albums.');
        setAlbums([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAlbums(false);
        }
      }
    };

    loadDiscography();
    return () => controller.abort();
  }, [selectedArtist]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (!newQuery.trim()) {
      setArtists([]);
      setSelectedArtist(null);
      setAlbums([]);
      setError(null);
      setIsSearchingArtists(false);
    }
  };

  const visibleAlbums = useMemo(() => {
    if (showSingles) return albums;
    return albums.filter((a) => !isSingleOrEp(a));
  }, [albums, showSingles]);

  const singlesCount = useMemo(
    () => albums.filter((a) => isSingleOrEp(a)).length,
    [albums]
  );

  const handleAlbumClick = (album: ItunesAlbum) => {
    setPickedAlbum(album);
    setRating('');
    setRatingError(null);
  };

  const handleConfirmPicked = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedAlbum) return;

    const numRating = parseFloat(rating);
    if (!rating.trim() || isNaN(numRating) || numRating < 0 || numRating > 10) {
      setRatingError('Please enter a rating between 0.0 and 10.0.');
      return;
    }

    onSelectAlbum(pickedAlbum, numRating);
  };

  const pickedExisting = pickedAlbum
    ? existingMap.get(pickedAlbum.collectionName.toLowerCase().trim())
    : undefined;

  return (
    <div className="space-y-6">
      {/* Artist Search Bar */}
      <div className="relative">
        <label className="block text-sm font-medium text-white/70 mb-2">
          Search Artist
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isSearchingArtists ? (
              <Loader2 className="w-5 h-5 text-neon-purple animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-white/40" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="e.g. Pink Floyd, Radiohead, Kendrick Lamar..."
            className="w-full pl-11 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple text-white transition-all placeholder:text-white/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              aria-label="Clear artist search"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Matching Artist Pills */}
      {artists.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-white/40 font-semibold">
              Matching Artists
            </span>
            {singlesCount > 0 && (
              <button
                type="button"
                onClick={() => setShowSingles((v) => !v)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  showSingles
                    ? 'bg-neon-purple/20 border-neon-purple/40 text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                {showSingles ? 'Hide' : 'Show'} Singles &amp; EPs ({singlesCount})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {artists.map((artist) => {
              const isSelected = selectedArtist?.artistId === artist.artistId;
              return (
                <button
                  key={artist.artistId}
                  type="button"
                  onClick={() => setSelectedArtist(artist)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    isSelected
                      ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {artist.artistName}
                  {artist.primaryGenreName && (
                    <span className="ml-1.5 text-xs opacity-60">
                      · {artist.primaryGenreName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading Discography */}
      {isLoadingAlbums && (
        <div className="flex flex-col items-center justify-center py-12 text-white/50 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
          <p className="text-sm">
            Loading {selectedArtist?.artistName}&apos;s albums...
          </p>
        </div>
      )}

      {/* Empty States */}
      {!isSearchingArtists && !isLoadingAlbums && query.trim() && artists.length === 0 && !error && (
        <div className="text-center py-10 text-white/40 text-sm">
          No artists found for &ldquo;{query.trim()}&rdquo;. Try another name or switch to Manual Entry.
        </div>
      )}

      {!isLoadingAlbums && selectedArtist && visibleAlbums.length === 0 && !error && (
        <div className="text-center py-10 text-white/40 text-sm">
          No studio albums found for {selectedArtist.artistName}.
          {singlesCount > 0 && !showSingles && (
            <button
              type="button"
              onClick={() => setShowSingles(true)}
              className="ml-1.5 text-neon-purple hover:underline"
            >
              Show {singlesCount} Singles &amp; EPs?
            </button>
          )}
        </div>
      )}

      {/* Visual Album Grid */}
      {!isLoadingAlbums && visibleAlbums.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>
              Click an album to rate &amp; add it ({visibleAlbums.length}{' '}
              {visibleAlbums.length === 1 ? 'release' : 'releases'})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[460px] overflow-y-auto pr-1">
            {visibleAlbums.map((album) => {
              const year = album.releaseDate
                ? album.releaseDate.substring(0, 4)
                : '';
              const existing = existingMap.get(
                album.collectionName.toLowerCase().trim()
              );

              return (
                <button
                  key={album.collectionId}
                  type="button"
                  onClick={() => handleAlbumClick(album)}
                  className="group text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-neon-purple/50 rounded-2xl p-2.5 transition-all flex flex-col focus:outline-none focus:ring-2 focus:ring-neon-purple"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 mb-2.5">
                    {album.artworkUrl100 ? (
                      <img
                        src={upgradeArtworkUrl(album.artworkUrl100, 400)}
                        alt={album.collectionName}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-10 h-10 text-white/20" />
                      </div>
                    )}

                    {existing && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 border border-yellow-400/40 text-yellow-300 text-[11px] font-bold backdrop-blur-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {existing.Rating}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-white line-clamp-2 leading-snug mb-1">
                    {album.collectionName}
                  </p>
                  <p className="text-xs text-white/45 mt-auto">
                    {[year, album.trackCount ? `${album.trackCount} tracks` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Rating Modal / Overlay when an album is clicked */}
      <AnimatePresence>
        {pickedAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setPickedAlbum(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-panel rounded-3xl p-6 border border-white/15 shadow-2xl space-y-5"
            >
              <div className="flex items-start gap-4">
                <img
                  src={upgradeArtworkUrl(pickedAlbum.artworkUrl100, 400)}
                  alt={pickedAlbum.collectionName}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white leading-snug line-clamp-2">
                    {pickedAlbum.collectionName}
                  </h3>
                  <p className="text-sm text-white/60 truncate">
                    {pickedAlbum.artistName}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {[
                      pickedAlbum.releaseDate?.substring(0, 4),
                      pickedAlbum.trackCount ? `${pickedAlbum.trackCount} tracks` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickedAlbum(null)}
                  aria-label="Close rating dialog"
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {pickedExisting && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    &ldquo;{pickedExisting.Album}&rdquo; is already on your wall with a
                    rating of {pickedExisting.Rating}/10. Continuing will add another entry.
                  </p>
                </div>
              )}

              <form onSubmit={handleConfirmPicked} className="space-y-4">
                <RatingInput value={rating} onChange={setRating} />

                {ratingError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {ratingError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPickedAlbum(null)}
                    className="flex-1 py-3 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-purple hover:bg-neon-purple/85 text-white font-bold text-sm transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Add to Wall
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
