import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexHtml = path.join(distDir, 'index.html');
const fallbackHtml = path.join(distDir, '404.html');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, fallbackHtml);
  console.log('Successfully copied index.html to 404.html for SPA routing fallback!');
} else {
  console.error('index.html not found in dist/');
  process.exit(1);
}
