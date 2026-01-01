const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/toSort', express.static('toSort'));
app.use('/approved', express.static('approved'));
app.use('/declined', express.static('declined'));

const TO_SORT_DIR = path.join(__dirname, 'toSort');
const APPROVED_DIR = path.join(__dirname, 'approved');
const DECLINED_DIR = path.join(__dirname, 'declined');

// Ensure directories exist
[TO_SORT_DIR, APPROVED_DIR, DECLINED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Get a list of images from the to sort folder
app.get('/api/images', (req, res) => {
  try {
    const files = fs.readdirSync(TO_SORT_DIR);
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    if (images.length === 0) {
      return res.json({ images: [] });
    }

    res.json({ images: images });
  } catch (error) {
    console.error('Error reading images:', error);
    res.status(500).json({ error: 'Failed to read images' });
  }
});

// Move image to approved folder
app.post('/api/approve', (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const sourcePath = path.join(TO_SORT_DIR, filename);
    const destPath = path.join(APPROVED_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Move file
    fs.renameSync(sourcePath, destPath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving image:', error);
    res.status(500).json({ error: 'Failed to approve image' });
  }
});

// Move image to declined folder
app.post('/api/decline', (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const sourcePath = path.join(TO_SORT_DIR, filename);
    const destPath = path.join(DECLINED_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Move file
    fs.renameSync(sourcePath, destPath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error declining image:', error);
    res.status(500).json({ error: 'Failed to decline image' });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
