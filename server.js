const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5050;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac'
};

const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

// Real-time connected clients tracker
let activeClients = new Set();

function getSynchronizedCount() {
  const nowSec = Math.floor(Date.now() / 1000);
  const interval5s = Math.floor(nowSec / 5);
  const date = new Date();
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const dailyFactor = Math.sin(((utcHours - 10.5) / 24) * 2 * Math.PI);
  const baseCount = 1320 + Math.floor(dailyFactor * 280);
  
  function getNoise(tick) {
    const x = Math.sin(tick * 12.9898 + 78.233) * 43758.5453;
    const rand = x - Math.floor(x);
    return Math.floor((rand - 0.48) * 26);
  }
  
  const realCount = activeClients.size;
  return Math.max(980, baseCount + getNoise(interval5s) + realCount);
}

function getSongsList() {
  const songsDir = path.join(__dirname, 'songs');
  if (!fs.existsSync(songsDir)) return [];
  
  const files = fs.readdirSync(songsDir);
  const songs = [];
  
  files.forEach((file, index) => {
    const ext = path.extname(file).toLowerCase();
    if (AUDIO_EXTS.includes(ext)) {
      const baseName = path.basename(file, ext);
      let title = baseName.replace(/^[0-9]+[_\-\s]+/, '').replace(/_/g, ' ');
      let artist = "भोजपुरी ऑर्केस्ट्रा स्पेशल";
      
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
        title: title,
        artist: artist,
        src: `/songs/${encodeURIComponent(file)}`,
        filename: file
      });
    }
  });

  return songs;
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  
  // Real-Time Server-Sent Events for Live Listener Count
  if (reqPath === '/api/live-stats') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientId = Date.now() + Math.random();
    activeClients.add(clientId);

    // Send initial count
    const sendUpdate = () => {
      const count = getSynchronizedCount();
      res.write(`data: ${JSON.stringify({ onlineCount: count, realActive: activeClients.size })}\n\n`);
    };

    sendUpdate();
    const interval = setInterval(sendUpdate, 3000);

    req.on('close', () => {
      clearInterval(interval);
      activeClients.delete(clientId);
    });
    return;
  }

  // Dynamic Songs API
  if (reqPath === '/api/songs' || reqPath === '/songs.json') {
    const songs = getSongsList();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(songs, null, 2));
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    const range = req.headers.range;
    if (range && stats.size > 0) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Bihari Orchestra server running at http://localhost:${PORT}`);
});
