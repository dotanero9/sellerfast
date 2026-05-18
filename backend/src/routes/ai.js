const express = require('express');
const { analyzeReviews, translateListing, checkConnection } = require('../services/ai');

const router = express.Router();

// Health check
router.get('/status', async (req, res) => {
  const ok = await checkConnection();
  res.json({ connected: ok, model: process.env.DEEPSEEK_MODEL || 'deepseek-chat' });
});

// Analyze product reviews
router.post('/analyze-reviews', async (req, res) => {
  const { productName, reviews } = req.body;
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({ error: 'reviews array required' });
  }

  try {
    const analysis = await analyzeReviews(productName || 'Unknown', reviews.slice(0, 100));
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Translate listing
router.post('/translate', async (req, res) => {
  const { text, languages } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    const result = await translateListing(text, languages || ['en', 'ja', 'de']);
    res.json({ translation: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
