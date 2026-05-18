require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const productsRouter = require('./routes/products');
const aiRouter = require('./routes/ai');
const { checkAllProducts } = require('./services/price-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/products', productsRouter);
app.use('/api/ai', aiRouter);

// Scheduled price check (only runs if extension background script can't do it)
const interval = process.env.SCRAPE_INTERVAL_MINUTES || 60;
cron.schedule(`*/${interval} * * * *`, async () => {
  console.log(`[${new Date().toISOString()}] Scheduled price check...`);
  try {
    const results = await checkAllProducts();
    console.log(`[${new Date().toISOString()}] Checked ${results.length} products`);
  } catch (err) {
    console.error('Scheduled check failed:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`SellerFast API running on port ${PORT}`);
  console.log(`AI: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat'} @ ${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'}`);
});
