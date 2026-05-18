const API_BASE = "http://43.128.117.46:3000/api"

// ── Message handler ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addProduct") {
    handleAddProduct(message, sendResponse)
    return true
  }
  if (message.action === "priceExtracted") {
    handlePriceExtracted(message)
  }
})

async function handleAddProduct(msg: any, sendResponse: (r: any) => void) {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "default" },
      body: JSON.stringify({
        platform: msg.platform,
        productId: msg.productId,
        productUrl: msg.productUrl,
        productName: msg.productName || msg.productUrl,
      })
    })
    const data = await res.json()
    if (res.ok) {
      // Immediately trigger a price check for this product
      checkSingleProduct(data.id, msg.productUrl, msg.platform)
      sendResponse({ success: true, id: data.id })
    } else {
      sendResponse({ error: data.error || "Failed to add" })
    }
  } catch (err: any) {
    sendResponse({ error: err.message })
  }
}

function handlePriceExtracted(msg: any) {
  // Content script found a price on a product page, save it
  fetch(`${API_BASE}/products/${msg.productId}/price`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": "default" },
    body: JSON.stringify({ price: msg.price, currency: msg.currency || "USD" })
  }).catch(() => {})
}

// ── Periodic price check ──

chrome.alarms.create("checkPrices", { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "checkPrices") {
    await checkAllProducts()
  }
})

// Also run a check on startup
checkAllProducts()

async function checkSingleProduct(productId: number, url: string, platform: string) {
  try {
    const price = await fetchAndExtractPrice(url, platform)
    if (price !== null) {
      await fetch(`${API_BASE}/products/${productId}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "default" },
        body: JSON.stringify({ price, currency: "USD" })
      })
    }
  } catch (e: any) {
    console.error(`[SellerFast] Check failed for #${productId}:`, e.message)
  }
}

async function checkAllProducts() {
  try {
    const listRes = await fetch(`${API_BASE}/products`, { headers: { "x-user-id": "default" } })
    if (!listRes.ok) return
    const products = await listRes.json()

    let updated = 0
    for (const p of products) {
      try {
        const price = await fetchAndExtractPrice(p.product_url, p.platform)
        if (price !== null && price !== p.current_price) {
          await fetch(`${API_BASE}/products/${p.id}/price`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": "default" },
            body: JSON.stringify({ price, currency: "USD" })
          })
          updated++
        }
        // 2-5s delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
      } catch (e: any) {
        console.error(`[SellerFast] Failed ${p.product_id}:`, e.message)
      }
    }

    if (updated > 0) {
      chrome.notifications?.create({
        type: "basic",
        iconUrl: "assets/icon128.png",
        title: "SellerFast",
        message: `${updated} product price(s) changed.`
      })
    }
  } catch (err: any) {
    console.error("[SellerFast] Check failed:", err.message)
  }
}

// ── Price scraping (from extension context → uses browser's fingerprint) ──

async function fetchAndExtractPrice(url: string, platform: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": navigator.userAgent,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return null

    const html = await res.text()
    return extractPriceFromHTML(html, url, platform)
  } catch {
    return null
  }
}

function extractPriceFromHTML(html: string, url: string, platform: string): number | null {
  const isAmazon = url.includes("amazon") || platform === "amazon"
  const isShopee = url.includes("shopee") || platform === "shopee"

  if (isAmazon) {
    // Amazon price patterns — try multiple
    const patterns = [
      /<span[^>]*class="a-price"[^>]*>[\s\S]*?<span[^>]*class="a-offscreen"[^>]*>\$?([\d,.]+)/i,
      /"a-price-whole"[^>]*>\s*([\d,.]+)/i,
      /<span[^>]*class="a-price-whole"[^>]*>\s*([\d,.]+)/i,
      /data-asin-price="([\d,.]+)"/i,
      /"priceblock_ourprice"[^>]*>\s*\$?([\d,.]+)/i,
      /"priceblock_dealprice"[^>]*>\s*\$?([\d,.]+)/i,
      /"priceblock_saleprice"[^>]*>\s*\$?([\d,.]+)/i,
      /<span[^>]*id="price_inside_buybox"[^>]*>\s*\$?([\d,.]+)/i,
    ]
    for (const re of patterns) {
      const match = html.match(re)
      if (match) return parseFloat(match[1].replace(/,/g, ""))
    }

    // Fallback: search for any price-like pattern near "price" keyword
    const priceSection = html.match(/class="a-price[\s\S]{0,2000}?<\/span>/i)
    if (priceSection) {
      const m = priceSection[0].match(/\$?([\d,]+\.\d{2})/)
      if (m) return parseFloat(m[1].replace(/,/g, ""))
    }
  }

  if (isShopee) {
    // Shopee embeds price in JSON/JS
    const patterns = [
      /"price"\s*:\s*(\d+)/,
      /"price_before_discount"\s*:\s*(\d+)/,
      /"price_min"\s*:\s*(\d+)/,
    ]
    for (const re of patterns) {
      const match = html.match(re)
      if (match) return parseInt(match[1]) / 100000
    }
  }

  return null
}

// ── Content script will also silently update prices ──
// When the user visits a monitored product page organically,
// the content script extracts the price and sends it here.

export {}
