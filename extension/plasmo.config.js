module.exports = {
  target: 'chrome-mv3',
  targets: ['chrome-mv3', 'edge-mv3'],
  manifest: {
    name: 'SellerFast - Amazon Price Tracker & Seller Tools',
    version: '0.1.0',
    description: 'Monitor competitor prices, analyze reviews with AI, and translate listings. Built for Amazon & Shopee sellers.',
    permissions: ['storage', 'alarms', 'notifications'],
    host_permissions: [
      'https://*.amazon.com/*',
      'https://*.amazon.co.jp/*',
      'https://*.amazon.co.uk/*',
      'https://*.amazon.de/*',
      'https://*.shopee.com/*',
      'https://*.shopee.tw/*',
      'http://localhost:3000/*',
      'https://*.sellerfast.com/*',
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'SellerFast',
    },
    icons: {
      16: 'assets/icon16.png',
      48: 'assets/icon48.png',
      128: 'assets/icon128.png',
    },
  },
};
