import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.amazon.com/*/dp/*",
    "https://www.amazon.com/dp/*",
    "https://www.amazon.co.jp/*/dp/*",
    "https://www.amazon.co.jp/dp/*",
    "https://www.amazon.co.uk/*/dp/*",
    "https://www.amazon.co.uk/dp/*",
    "https://www.amazon.de/*/dp/*",
    "https://www.amazon.de/dp/*",
    "https://shopee.com/*",
    "https://shopee.tw/*",
    "https://shopee.sg/*",
    "https://shopee.co.id/*"
  ]
}

const ProductOverlay = () => {
  // When user visits a product page, silently extract price
  // If this product is being monitored, update it automatically
  const updatePrice = () => {
    const url = window.location.href
    const platform = url.includes("amazon") ? "amazon" : "shopee"

    let productId = url
    if (platform === "amazon") {
      const match = url.match(/\/dp\/([A-Z0-9]+)/)
      if (match) productId = match[1]
    }

    const { price } = extractPrice()
    if (price !== null) {
      chrome.runtime.sendMessage({
        action: "priceExtracted",
        productId,
        price,
        currency: platform === "amazon" ? "USD" : "TWD"
      })
    }
  }

  // Run once when page loads
  updatePrice()

  const handleAddToMonitor = () => {
    const url = window.location.href
    const platform = url.includes("amazon") ? "amazon" : "shopee"
    let productId = url
    if (platform === "amazon") {
      const match = url.match(/\/dp\/([A-Z0-9]+)/)
      if (match) productId = match[1]
    }

    const { price, name } = extractPrice()

    chrome.runtime.sendMessage({
      action: "addProduct",
      platform,
      productUrl: url,
      productId,
      productName: name,
      currentPrice: price,
    }, (response) => {
      if (response?.error) {
        alert("Error: " + response.error)
      } else {
        alert(price
          ? `✅ Monitoring "${name || productId}" — $${price.toFixed(2)}`
          : `✅ Added "${name || productId}". Price will be checked shortly.`)
      }
    })
  }

  return (
    <button
      onClick={handleAddToMonitor}
      style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9999,
        background: "#2563eb", color: "#fff", border: "none",
        borderRadius: 8, padding: "10px 18px", fontSize: 14,
        fontWeight: 600, cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        display: "flex", alignItems: "center", gap: 6
      }}>
      📊 Monitor with SellerFast
    </button>
  )
}

function extractPrice(): { price: number | null; name: string } {
  const url = window.location.href
  let price: number | null = null
  let name = ""

  if (url.includes("amazon")) {
    const selectors = ['.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice', '.a-price-whole', '[data-asin-price]', '#corePrice_desktop .a-price .a-offscreen']
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el?.textContent) {
        let text = el.textContent.trim()
        if (el.hasAttribute("data-asin-price")) text = el.getAttribute("data-asin-price") || ""
        const match = text.match(/[\d,.]+/)
        if (match) { price = parseFloat(match[0].replace(/,/g, "")); break }
      }
    }
    name = (document.querySelector("#productTitle") as HTMLElement)?.textContent?.trim() || ""
  }

  if (url.includes("shopee")) {
    const priceEl = document.querySelector('div.pqTWkA, div._3e_UQT')
    if (priceEl?.textContent) {
      const match = priceEl.textContent.match(/[\d,.]+/)
      if (match) price = parseFloat(match[0].replace(/,/g, ""))
    }
    name = document.querySelector("h1")?.textContent?.trim() || ""
  }

  return { price, name }
}

export default ProductOverlay
