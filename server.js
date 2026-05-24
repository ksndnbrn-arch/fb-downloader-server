// ============================================
// Facebook Video Downloader Backend
// Powered by yt-dlp (unlimited, free)
// Deploy on Render.com
// ============================================

const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow all websites to use this API
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FB Downloader Server is running!',
    usage: 'POST or GET /download with { url: "..." }'
  });
});

// Main download endpoint
async function handleDownload(req, res) {
  try {
    const url = (req.body && req.body.url) || req.query.url;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log('Processing:', url);
    
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:facebook.com', 'user-agent:Mozilla/5.0']
    });
    
    // Build medias array
    const medias = [];
    const seen = new Set();
    
    if (info.formats && Array.isArray(info.formats)) {
      info.formats.forEach(f => {
        if (f.url && f.vcodec && f.vcodec !== 'none' && !seen.has(f.url)) {
          seen.add(f.url);
          let quality = 'Video';
          if (f.height) quality = f.height + 'p';
          else if (f.format_note) quality = f.format_note;
          else if (f.quality) quality = String(f.quality);
          
          medias.push({
            url: f.url,
            quality: quality,
            type: 'video'
          });
        }
      });
    }
    
    // Fallback: single URL
    if (medias.length === 0 && info.url) {
      medias.push({
        url: info.url,
        quality: info.height ? info.height + 'p' : 'HD'
      });
    }
    
    if (medias.length === 0) {
      return res.status(404).json({ error: 'No video found in this URL' });
    }
    
    // Sort by quality (highest first)
    medias.sort((a, b) => {
      const ha = parseInt(a.quality) || 0;
      const hb = parseInt(b.quality) || 0;
      return hb - ha;
    });
    
    res.json({
      title: info.title || 'Video',
      thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0] && info.thumbnails[0].url) || '',
      duration: info.duration || null,
      medias: medias
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({
      error: 'Failed to extract video',
      details: err.message
    });
  }
}

app.post('/download', handleDownload);
app.get('/download', handleDownload);

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
