const db = require('../db');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract price from Amazon page HTML
function extractAmazonPrice(html) {
  // Try multiple selectors Amazon uses
  const patterns = [
    /"priceblock_ourprice"[^>]*>\s*\$?([\d,.]+)/i,
    /"a-price-whole"[^>]*>\s*([\d,.]+)/i,
    /<span[^>]*class="a-price"[^>]*>[\s\S]*?<span[^>]*class="a-offscreen"[^>]*>\$?([\d,.]+)/i,
    /data-asin-price="([\d,.]+)"/i,
    /"priceblock_dealprice"[^>]*>\s*\$?([\d,.]+)/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

// Extract product name from Amazon page
function extractAmazonName(html) {
  const match = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)</i);
  return match ? match[1].trim() : '';
}

async function scrapeAmazonPrice(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return { error: `HTTP ${response.status}` };

    const html = await response.text();
    const price = extractAmazonPrice(html);
    const name = extractAmazonName(html);

    return { price, name, currency: 'USD' };
  } catch (err) {
    return { error: err.message };
  }
}

async function scrapeShopeePrice(url) {
  // Shopee requires different approach - placeholder for now
  return { error: 'Shopee scraping not yet implemented' };
}

function getScraper(platform) {
  switch (platform.toLowerCase()) {
    case 'amazon': return scrapeAmazonPrice;
    case 'shopee': return scrapeShopeePrice;
    default: return null;
  }
}

async function checkProductPrice(productRow) {
  const scraper = getScraper(productRow.platform);
  if (!scraper) return { error: `Unknown platform: ${productRow.platform}` };

  const result = await scraper(productRow.product_url);

  if (result.error || result.price === null) return result;

  // Save price history
  const stmt = db.prepare('INSERT INTO price_history (product_id, price, currency) VALUES (?, ?, ?)');
  stmt.run(productRow.id, result.price, result.currency || 'USD');

  // Update current price
  const update = db.prepare('UPDATE products SET current_price = ?, currency = ?, product_name = ?, updated_at = datetime(\'now\') WHERE id = ?');
  update.run(result.price, result.currency || 'USD', result.name || productRow.product_name, productRow.id);

  return result;
}

async function checkAllProducts() {
  const products = db.prepare('SELECT * FROM products').all();
  const results = [];

  for (const product of products) {
    const result = await checkProductPrice(product);
    results.push({ id: product.id, ...result });
    await delay(2000 + Math.random() * 3000); // 2-5s delay between requests
  }

  return results;
}

module.exports = { checkProductPrice, checkAllProducts, getScraper };
