/**
 * fetch_covers.cjs
 *
 * Fetches missing album cover art for entries in Album-Data.json.
 *
 * Strategy (in order):
 *  1. iTunes Search API — "Artist + Album" query (most accurate)
 *  2. iTunes Search API — album title only (catches renamed/reissued albums)
 *  3. MusicBrainz + Cover Art Archive — free, no auth, great for obscure/non-iTunes releases
 *
 * TODO: Consider migrating to a Supabase backend (Option A in ALBUM_INTAKE_SPEC.md)
 *       so that cover data is stored server-side rather than baked into the JSON.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'Album-Data.json');
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Strategy 1 & 2: iTunes Search API ───────────────────────────────────────
async function searchItunes(query) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=3`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`iTunes HTTP ${response.status}`);
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch (e) { throw new Error(`iTunes invalid JSON`); }
  return result.results || [];
}

function extractItunesData(albumResult) {
  let highResCover = albumResult.artworkUrl100;
  if (highResCover) highResCover = highResCover.replace('100x100bb', '600x600bb');
  return {
    CoverArt: highResCover || '',
    AppleMusicLink: albumResult.collectionViewUrl || '',
    TrackCount: albumResult.trackCount || 0,
    ExactReleaseDate: albumResult.releaseDate ? albumResult.releaseDate.split('T')[0] : '',
  };
}

// ─── Strategy 3: MusicBrainz + Cover Art Archive ─────────────────────────────
async function searchMusicBrainz(artist, album) {
  // MusicBrainz requires a User-Agent header
  const query = encodeURIComponent(`release:"${album}" AND artist:"${artist}"`);
  const mbUrl = `https://musicbrainz.org/ws/2/release-group/?query=${query}&limit=1&fmt=json`;
  const mbRes = await fetch(mbUrl, {
    headers: { 'User-Agent': 'PersonalPortfolio/1.0 (github.com/Dylfive/Personal-Website)' }
  });
  if (!mbRes.ok) throw new Error(`MusicBrainz HTTP ${mbRes.status}`);
  const mbData = await mbRes.json();
  const releaseGroups = mbData['release-groups'];
  if (!releaseGroups || releaseGroups.length === 0) return null;

  const mbid = releaseGroups[0].id;
  await sleep(1100); // MusicBrainz rate limit: 1 req/sec

  // Fetch cover art from Cover Art Archive
  const caaUrl = `https://coverartarchive.org/release-group/${mbid}/front`;
  const caaRes = await fetch(caaUrl, { redirect: 'follow' });
  if (!caaRes.ok) return null;
  // The API redirects to the actual image URL — return that URL
  return caaRes.url;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function fetchAlbumData() {
  const missing = data.filter(
    (item) => !item.CoverArt || item.CoverArt === 'Not Found' || item.CoverArt.includes('Rate limit')
  );

  console.log(`\nTotal albums: ${data.length}`);
  console.log(`Albums missing cover art: ${missing.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    if (item.CoverArt && item.CoverArt !== 'Not Found' && !item.CoverArt.includes('Rate limit')) {
      continue;
    }

    console.log(`[${i + 1}/${data.length}] Searching: "${item.Album}" by ${item.Artist}`);
    let found = false;

    // ── Strategy 1: Artist + Album ─────────────────────────────────────────
    try {
      await sleep(2500);
      const results = await searchItunes(`${item.Artist} ${item.Album}`);
      if (results.length > 0) {
        Object.assign(item, extractItunesData(results[0]));
        console.log(`  ✓ [iTunes: Artist+Album] ${item.Album}`);
        successCount++;
        found = true;
      }
    } catch (err) {
      console.warn(`  ! iTunes strategy 1 error: ${err.message}`);
    }

    // ── Strategy 2: Album title only ───────────────────────────────────────
    if (!found) {
      try {
        await sleep(2500);
        const results = await searchItunes(item.Album);
        // Pick the result where artistName loosely matches
        const match = results.find(
          (r) => r.artistName && r.artistName.toLowerCase().includes(item.Artist.split(' ')[0].toLowerCase())
        ) || results[0];
        if (match) {
          Object.assign(item, extractItunesData(match));
          console.log(`  ✓ [iTunes: title-only] ${item.Album}`);
          successCount++;
          found = true;
        }
      } catch (err) {
        console.warn(`  ! iTunes strategy 2 error: ${err.message}`);
      }
    }

    // ── Strategy 3: MusicBrainz + Cover Art Archive ────────────────────────
    if (!found) {
      try {
        await sleep(1200);
        const coverUrl = await searchMusicBrainz(item.Artist, String(item.Album));
        if (coverUrl) {
          item.CoverArt = coverUrl;
          console.log(`  ✓ [MusicBrainz] ${item.Album}`);
          successCount++;
          found = true;
        }
      } catch (err) {
        console.warn(`  ! MusicBrainz error: ${err.message}`);
      }
    }

    if (!found) {
      console.log(`  ✗ Not found after all strategies: "${item.Album}" by ${item.Artist}`);
      item.CoverArt = 'Not Found';
      failCount++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n──────────────────────────────────────`);
  console.log(`Done! Recovered: ${successCount}  Still missing: ${failCount}`);
  console.log(`──────────────────────────────────────\n`);
}

fetchAlbumData();
