const API_BASE = "http://43.128.117.46:3000/api"

// ── Messages ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addProduct") {
    addProductViaAPI(message).then(r => sendResponse(r)).catch(e => sendResponse({ error: e.message }))
    return true
  }
  if (message.action === "priceExtracted") {
    savePrice(message).catch(() => {})
  }
  if (message.action === "checkNow") {
    runPriceCheck().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true
  }
})

async function addProductViaAPI(msg: any) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": "default" },
    body: JSON.stringify({
      platform: msg.platform,
      productId: msg.productId,
      productUrl: msg.productUrl,
      productName: msg.productName || msg.productUrl,
      initialPrice: msg.currentPrice || null,
    })
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error || "Failed" }
  return { success: true, id: data.id }
}

async function savePrice(msg: any) {
  await fetch(`${API_BASE}/products/${msg.productId}/price`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": "default" },
    body: JSON.stringify({ price: msg.price, currency: msg.currency || "USD" })
  })
}

// ── Periodic check ──

chrome.alarms.create("checkPrices", { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkPrices") runPriceCheck()
})

async function runPriceCheck() {
  try {
    const res = await fetch(`${API_BASE}/products`, { headers: { "x-user-id": "default" } })
    if (!res.ok) return
    const products = await res.json()
    if (!products?.length) return

    let updated = 0
    for (const p of products) {
      try {
        const price = await fetchPrice(p.product_url, p.platform)
        if (price !== null) {
          await fetch(`${API_BASE}/products/${p.id}/price`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": "default" },
            body: JSON.stringify({ price, currency: "USD" })
          })
          updated++
        }
      } catch (e) { /* skip failed product */ }
      // Delay between requests
      await new Promise(r => setTimeout(r, 3000))
    }

    if (updated > 0) {
      chrome.notifications?.create({
        type: "basic", iconUrl: "assets/icon128.png",
        title: "SellerFast", message: `${updated} price(s) updated.`
      })
    }
  } catch (e) { /* silent */ }
}

// ── Fetch price (from browser context — real cookies, real IP) ──

async function fetchPrice(url: string, platform: string): Promise<number | null> {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 12000)

    const res = await fetch(url, {
      headers: {
        "User-Agent": navigator.userAgent,
        "Accept": "text/html",
        "Accept-Language": "en-US;q=0.9",
      },
      signal: controller.signal,
    })
    if (!res.ok) return null

    // Only read first 500KB to avoid memory issues
    const reader = res.body?.getReader()
    if (!reader) return null

    let html = ""
    const decoder = new TextDecoder()
    while (html.length < 500000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
    }
    reader.cancel() // stop reading

    return extractPrice(html, url, platform)
  } catch {
    return null
  }
}

function extractPrice(html: string, url: string, platform: string): number | null {
  const isAmazon = url.includes("amazon") || platform === "amazon"

  if (isAmazon) {
    // Amazon price regex patterns
    const patterns = [
      /<span[^>]*class="a-offscreen"[^>]*>\$?([\d,.]+)/i,
      /data-asin-price="([\d,.]+)"/i,
      /"priceblock_ourprice"[^>]*>\$?([\d,.]+)/i,
      /"priceblock_dealprice"[^>]*>\$?([\d,.]+)/i,
      /<span[^>]*class="a-price-whole"[^>]*>([\d,.]+)/i,
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m) return parseFloat(m[1].replace(/,/g, ""))
    }
  }

  // Shopee: search for price in JSON data
  if (!isAmazon) {
    const m = html.match(/"price"\s*:\s*(\d+)/)
    if (m) return parseInt(m[1]) / 100000
    const m2 = html.match(/"price_before_discount"\s*:\s*(\d+)/)
    if (m2) return parseInt(m2[1]) / 100000
  }

  return null
}

export {}
