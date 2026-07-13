import { useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useItunesSearch } from '../../hooks/useItunesSearch';
import type { ItunesResult } from '../../hooks/useItunesSearch';

interface AlbumSearchInputProps {
  onSelect: (result: ItunesResult) => void;
}

export default function AlbumSearchInput({ onSelect }: AlbumSearchInputProps) {
  const { query, setQuery, results, isSearching, error } = useItunesSearch();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setQuery(''); // Simple way to close dropdown by clearing query if they click away
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setQuery]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-sm font-medium text-white/70 mb-2">Search Album</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-white/50" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type an album name..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent text-white transition-all placeholder:text-white/30"
        />
      </div>

      {query && !isSearching && (
        <div className="absolute z-50 w-full mt-2 bg-[#121212] border border-white/10 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center text-red-400 text-sm">Error: {error}</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-white/50 text-sm">No results found</div>
          ) : (
            <ul>
              {results.map((result, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(result);
                      setQuery(''); // Close dropdown
                    }}
                    className="w-full flex items-center gap-4 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <img 
                      src={result.artworkUrl100} 
                      alt="Artwork" 
                      className="w-12 h-12 rounded object-cover" 
                      loading="lazy" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{result.collectionName}</p>
                      <p className="text-white/50 text-sm truncate">{result.artistName}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
