/**
 * Build-time song list generator.
 * Scans the /songs folder and writes songs.json to the project root.
 * This lets Vercel (and any static host) serve the song list as a
 * plain static file, instead of relying on server.js being alive.
 *
 * Run automatically on `npm run build` (see package.json / vercel.json).
 * Safe to also run locally — server.js still computes the list live
 * for local dev, so this file is just a fallback/static mirror.
 */
const fs = require('fs');
const path = require('path');

const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
const songsDir = path.join(__dirname, 'songs');
const outFile = path.join(__dirname, 'songs.json');

function getSongsList() {
  if (!fs.existsSync(songsDir)) {
    console.warn('No songs/ folder found at', songsDir);
    return [];
  }

  const files = fs.readdirSync(songsDir);
  const songs = [];

  files.forEach((file, index) => {
    const ext = path.extname(file).toLowerCase();
    if (!AUDIO_EXTS.includes(ext)) return;

    const baseName = path.basename(file, ext);
    let title = baseName.replace(/^[0-9]+[_\-\s]+/, '').replace(/_/g, ' ');
    let artist = 'भोजपुरी ऑर्केस्ट्रा स्पेशल';

    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      artist = parts[0].trim();
      title = parts[1].trim();
    } else if (title.includes('-')) {
      const parts = title.split('-');
      artist = parts[0].trim();
      title = parts[1].trim();
    }

    songs.push({
      id: `local_${index}`,
      title,
      artist,
      src: `/songs/${encodeURIComponent(file)}`,
      filename: file
    });
  });

  return songs;
}

const songs = getSongsList();
fs.writeFileSync(outFile, JSON.stringify(songs, null, 2));
console.log(`songs.json generated with ${songs.length} song(s) from /songs`);
