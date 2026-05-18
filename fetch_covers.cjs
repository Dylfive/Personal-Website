const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'Album-Data.json');
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Sleep function to avoid rate limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAlbumData() {
  console.log(`Starting to fetch data for ${data.length} albums...`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Skip if we already have the cover art
    if (item.CoverArt && item.CoverArt !== 'Not Found' && !item.CoverArt.includes('Rate limit')) {
      continue;
    }

    try {
      // Create a search query using both Artist and Album for better accuracy
      const query = encodeURIComponent(`${item.Artist} ${item.Album}`);
      const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
         throw new Error(`HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON: ${text.substring(0, 50)}...`);
      }

      if (result.results && result.results.length > 0) {
        const albumData = result.results[0];
        
        let highResCover = albumData.artworkUrl100;
        if (highResCover) {
           highResCover = highResCover.replace('100x100bb', '600x600bb');
        }

        item.CoverArt = highResCover || '';
        item.AppleMusicLink = albumData.collectionViewUrl || '';
        item.TrackCount = albumData.trackCount || 0;
        
        if (albumData.releaseDate) {
          item.ExactReleaseDate = albumData.releaseDate.split('T')[0];
        }

        console.log(`[+] Found data for: ${item.Album} by ${item.Artist}`);
        successCount++;
      } else {
        console.log(`[-] Could not find: ${item.Album} by ${item.Artist}`);
        item.CoverArt = 'Not Found';
        failCount++;
      }
    } catch (err) {
      console.error(`[!] Error fetching ${item.Album}: ${err.message}`);
      // Remove any bad CoverArt string so it can be retried
      delete item.CoverArt; 
      failCount++;
    }

    // Wait 2500ms between requests to respect Apple's rate limits
    await sleep(2500);
  }

  // Save the updated JSON back to the file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nDone! Successfully updated ${successCount} albums. Failed on ${failCount} albums.`);
}

fetchAlbumData();
