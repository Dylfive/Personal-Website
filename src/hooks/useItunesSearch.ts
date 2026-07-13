import { useState, useEffect } from 'react';

export interface ItunesResult {
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  collectionViewUrl: string;
  trackCount: number;
  releaseDate: string;
}

export function useItunesSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItunesResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
          query
        )}&entity=album&limit=8`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch from iTunes API');
        }
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, results, isSearching, error };
}
