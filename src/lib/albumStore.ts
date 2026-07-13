import type { AlbumEntry } from '../types/album';

// TODO: Option A (Supabase) is the recommended upgrade path for data persistence in the future.
// Currently using Option B: GitHub Contents API directly from the browser.

async function fetchGitHubFile() {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const repo = import.meta.env.VITE_GITHUB_REPO;
  const path = import.meta.env.VITE_GITHUB_FILE_PATH;
  const branch = import.meta.env.VITE_GITHUB_BRANCH || 'main';

  if (!token || !repo || !path) {
    throw new Error('Missing GitHub configuration in environment variables.');
  }

  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
  const getRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!getRes.ok) {
    throw new Error(`Failed to fetch current data: ${getRes.statusText}`);
  }

  const fileData = await getRes.json();
  const sha = fileData.sha;
  const base64Content = fileData.content.replace(/\n/g, '');
  const decodedContent = decodeURIComponent(escape(atob(base64Content)));

  let albums: AlbumEntry[] = [];
  try {
    albums = JSON.parse(decodedContent);
  } catch {
    throw new Error('Failed to parse existing album data.');
  }

  return { albums, sha, token, repo, path, branch };
}

async function commitGitHubFile(
  albums: AlbumEntry[],
  sha: string,
  commitMessage: string,
  token: string,
  repo: string,
  path: string,
  branch: string
) {
  const updatedJson = JSON.stringify(albums, null, 2);
  const updatedBase64 = btoa(unescape(encodeURIComponent(updatedJson)));

  const putUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: commitMessage, content: updatedBase64, sha, branch }),
  });

  if (!putRes.ok) {
    const errObj = await putRes.json().catch(() => ({}));
    throw new Error(`Failed to commit: ${putRes.statusText} - ${errObj.message || ''}`);
  }
}

export async function appendAlbumToGitHub(newAlbum: AlbumEntry): Promise<void> {
  const { albums, sha, token, repo, path, branch } = await fetchGitHubFile();
  albums.push(newAlbum);
  await commitGitHubFile(
    albums, sha,
    `Add album: ${newAlbum.Album} by ${newAlbum.Artist} via Intake Form`,
    token, repo, path, branch
  );
}

export async function updateAlbumOnGitHub(originalName: string, updatedAlbum: AlbumEntry): Promise<void> {
  const { albums, sha, token, repo, path, branch } = await fetchGitHubFile();

  const idx = albums.findIndex(
    (a) => String(a.Album).toLowerCase().trim() === originalName.toLowerCase().trim()
  );

  if (idx === -1) {
    throw new Error(`Could not find "${originalName}" in the dataset to update.`);
  }

  albums[idx] = updatedAlbum;

  await commitGitHubFile(
    albums, sha,
    `Update album: ${updatedAlbum.Album} by ${updatedAlbum.Artist} via Intake Form`,
    token, repo, path, branch
  );
}
