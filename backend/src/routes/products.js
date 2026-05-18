const express = require('express');
const db = require('../db');
const { checkProductPrice, checkAllProducts } = require('../services/price-scraper');

const router = express.Router();

// List all products for a user
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';
  const products = db.prepare(
    'SELECT p.*, (SELECT price FROM price_history WHERE product_id = p.id ORDER BY recorded_at DESC LIMIT 1) as latest_price FROM products p WHERE p.user_id = ? ORDER BY p.updated_at DESC'
  ).all(userId);
  res.json(products);
});

// Add a product to monitor
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';
  const { platform, productId, productUrl } = req.body;

  if (!platform || !productUrl) {
    return res.status(400).json({ error: 'platform and productUrl required' });
  }

  // Check duplicate
  const existing = db.prepare('SELECT id FROM products WHERE user_id = ? AND platform = ? AND product_id = ?')
    .get(userId, platform, productId || productUrl);

  if (existing) {
    return res.status(409).json({ error: 'Product already monitored', id: existing.id });
  }

  const { productName, initialPrice, currency } = req.body;

  const stmt = db.prepare('INSERT INTO products (user_id, platform, product_id, product_url, product_name, current_price, currency) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(userId, platform, productId || productUrl, productUrl, productName || 'Loading...', initialPrice || null, currency || 'USD');

  // If initial price provided, save to history immediately
  if (initialPrice) {
    db.prepare('INSERT INTO price_history (product_id, price, currency) VALUES (?, ?, ?)')
      .run(result.lastInsertRowid, initialPrice, currency || 'USD');
  }

  res.status(201).json({ id: result.lastInsertRowid, message: 'Product added' });
});

// Delete a monitored product
router.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';
  db.prepare('DELETE FROM price_history WHERE product_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ message: 'Deleted' });
});

// Get price history for a product
router.get('/:id/history', (req, res) => {
  const history = db.prepare(
    'SELECT price, currency, recorded_at FROM price_history WHERE product_id = ? ORDER BY recorded_at DESC LIMIT 90'
  ).all(req.params.id);
  res.json(history);
});

// Save price reported by extension
router.post('/:id/price', (req, res) => {
  const { price, currency } = req.body;
  if (!price) return res.status(400).json({ error: 'price required' });

  db.prepare('INSERT INTO price_history (product_id, price, currency) VALUES (?, ?, ?)')
    .run(req.params.id, price, currency || 'USD');
  db.prepare('UPDATE products SET current_price = ?, currency = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(price, currency || 'USD', req.params.id);

  res.json({ message: 'Price recorded', price, currency });
});

// Force refresh a single product (server-side scrape, fallback)
router.post('/:id/refresh', async (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });

  const result = await checkProductPrice(product);
  res.json(result);
});

// Refresh all products (admin/manual trigger)
router.post('/refresh-all', async (req, res) => {
  const results = await checkAllProducts();
  res.json({ checked: results.length, results });
});

// Get product count for a user (for free tier limit)
router.get('/count', (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';
  const row = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(userId);
  res.json({ count: row.count });
});

module.exports = router;
