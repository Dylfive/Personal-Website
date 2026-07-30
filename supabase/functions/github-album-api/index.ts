// Supabase Edge Function — github-album-api
// Runs server-side (Deno runtime). The GitHub token NEVER reaches the browser.
// Requires these Supabase secrets:
//   GITHUB_TOKEN, GITHUB_REPO, GITHUB_FILE_PATH, GITHUB_BRANCH
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify the caller is an authenticated Supabase user ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing auth token' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── 2. Parse the request body ──
    const { action, album, originalName } = await req.json();

    if (!action || !['append', 'update'].includes(action)) {
      return json({ error: 'Invalid action. Must be "append" or "update".' }, 400);
    }

    // ── 3. Read GitHub config from server-side secrets ──
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')!;
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO') ?? 'Dylfive/Personal-Website';
    const GITHUB_FILE_PATH = Deno.env.get('GITHUB_FILE_PATH') ?? 'src/data/Album-Data.json';
    const GITHUB_BRANCH = Deno.env.get('GITHUB_BRANCH') ?? 'main';

    const githubHeaders = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // ── 4. Fetch the current file from GitHub ──
    const fileUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
    const getRes = await fetch(fileUrl, { headers: githubHeaders });

    if (!getRes.ok) {
      throw new Error(`Failed to fetch file: ${getRes.statusText}`);
    }

    const fileData = await getRes.json();
    const sha: string = fileData.sha;

    // Decode base64 content → UTF-8 string
    const base64 = (fileData.content as string).replace(/\n/g, '');
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const fileContent = new TextDecoder().decode(bytes);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albums: any[] = JSON.parse(fileContent);

    // ── 5. Mutate the album list ──
    let commitMessage: string;

    if (action === 'append') {
      albums.push(album);
      commitMessage = `Add album: ${album.Album} by ${album.Artist} via Intake Form`;
    } else {
      // update
      const idx = albums.findIndex(
        (a) =>
          String(a.Album).toLowerCase().trim() ===
          String(originalName).toLowerCase().trim(),
      );
      if (idx === -1) {
        return json({ error: `Album "${originalName}" not found in dataset.` }, 404);
      }
      albums[idx] = album;
      commitMessage = `Update album: ${album.Album} by ${album.Artist} via Intake Form`;
    }

    // ── 6. Encode back to base64 and commit ──
    const updatedJson = JSON.stringify(albums, null, 2);
    const encodedBytes = new TextEncoder().encode(updatedJson);
    const binaryArr = Array.from(encodedBytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    const updatedBase64 = btoa(binaryArr);

    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        method: 'PUT',
        headers: githubHeaders,
        body: JSON.stringify({
          message: commitMessage,
          content: updatedBase64,
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!putRes.ok) {
      const errBody = await putRes.json().catch(() => ({}));
      throw new Error(`Failed to commit: ${putRes.statusText} — ${errBody.message ?? ''}`);
    }

    return json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
