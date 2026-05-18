const API_BASE = "http://43.128.117.46:3000/api"

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addProduct") {
    handleAddProduct(message, sendResponse)
    return true
  }
})

async function handleAddProduct(msg: any, sendResponse: (r: any) => void) {
  try {
    const body: any = {
      platform: msg.platform,
      productId: msg.productId,
      productUrl: msg.productUrl,
      productName: msg.productName || "",
    }
    if (msg.currentPrice) {
      body.initialPrice = msg.currentPrice
      body.currency = msg.currency || "USD"
    }

    const res = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "default"
      },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (res.ok) {
      sendResponse({ success: true, id: data.id })
    } else {
      sendResponse({ error: data.error || "Failed to add" })
    }
  } catch (err: any) {
    sendResponse({ error: err.message })
  }
}

// Periodic price check from extension context
chrome.alarms.create("checkPrices", { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "checkPrices") {
    console.log("[SellerFast] Background price check starting...")
    await checkAllPrices()
  }
})

async function checkAllPrices() {
  try {
    // Get product list from backend
    const listRes = await fetch(`${API_BASE}/products`, {
      headers: { "x-user-id": "default" }
    })
    const products = await listRes.json()

    let updated = 0
    for (const p of products) {
      try {
        const price = await scrapePriceFromProductPage(p.product_url, p.platform)
        if (price !== null) {
          await fetch(`${API_BASE}/products/${p.id}/price`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": "default"
            },
            body: JSON.stringify({ price, currency: "USD" })
          })
          updated++
        }
        // Delay between requests
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
      } catch (e: any) {
        console.error(`[SellerFast] Failed to check ${p.product_id}:`, e.message)
      }
    }

    console.log(`[SellerFast] Price check done: ${updated}/${products.length} updated`)

    if (updated > 0) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon128.png",
        title: "SellerFast",
        message: `${updated} price(s) updated.`
      })
    }
  } catch (err: any) {
    console.error("[SellerFast] Price check failed:", err.message)
  }
}

async function scrapePriceFromProductPage(url: string, platform: string): Promise<number | null> {
  try {
    // Fetch from extension context (has user's browser fingerprint)
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

    if (url.includes("amazon") || platform === "amazon") {
      const patterns = [
        /"priceblock_ourprice"[^>]*>\s*\$?([\d,.]+)/i,
        /"a-price-whole"[^>]*>\s*([\d,.]+)/i,
        /<span[^>]*class="a-offscreen"[^>]*>\$?([\d,.]+)/i,
        /data-asin-price="([\d,.]+)"/i,
        /"priceblock_dealprice"[^>]*>\s*\$?([\d,.]+)/i,
        /<span[^>]*class="a-price"[^>]*>[\s\S]*?<span[^>]*class="a-offscreen"[^>]*>\$?([\d,.]+)/i,
      ]
      for (const re of patterns) {
        const match = html.match(re)
        if (match) return parseFloat(match[1].replace(/,/g, ""))
      }
    }

    if (url.includes("shopee") || platform === "shopee") {
      // Shopee uses JSON data
      const match = html.match(/"price"\s*:\s*(\d+)/)
      if (match) return parseInt(match[1]) / 100000
    }

    return null
  } catch {
    return null
  }
}

export {}
