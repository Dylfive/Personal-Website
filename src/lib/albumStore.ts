// albumStore.ts
// All GitHub API calls now go through a Supabase Edge Function so the
// GitHub token is never exposed in the browser bundle.
// See: supabase/functions/github-album-api/index.ts

import type { AlbumEntry } from '../types/album';
import { supabase } from './supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-album-api`;

async function callGitHubAPI(body: Record<string, unknown>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be signed in to save album data.');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error ?? `Request failed: ${response.statusText}`);
  }
}

export async function fetchGitHubAlbums(): Promise<AlbumEntry[]> {
  try {
    const res = await fetch('https://raw.githubusercontent.com/Dylfive/Personal-Website/main/src/data/Album-Data.json');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch raw GitHub albums', err);
  }
  const rawData = await import('../data/Album-Data.json');
  return rawData.default as AlbumEntry[];
}

export async function appendAlbumToGitHub(newAlbum: AlbumEntry): Promise<void> {
  await callGitHubAPI({ action: 'append', album: newAlbum });
}

export async function updateAlbumOnGitHub(
  originalName: string,
  updatedAlbum: AlbumEntry,
): Promise<void> {
  await callGitHubAPI({ action: 'update', album: updatedAlbum, originalName });
}

