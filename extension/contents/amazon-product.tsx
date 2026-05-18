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
    "https://shopee.com/*-i.*",
    "https://shopee.tw/*-i.*"
  ]
}

// Extract price from the current page DOM
function extractPrice(): { price: number | null; currency: string; name: string } {
  const url = window.location.href

  if (url.includes("amazon")) {
    // Amazon price selectors (try multiple)
    const selectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price-whole',
      '[data-asin-price]',
      '#corePrice_desktop .a-price .a-offscreen',
      '#corePrice_feature_div .a-price .a-offscreen',
    ]
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        let text = el.textContent?.trim() || ""
        if (el.hasAttribute("data-asin-price")) {
          text = el.getAttribute("data-asin-price") || ""
        }
        const match = text.match(/[\d,.]+/)
        if (match) {
          return {
            price: parseFloat(match[0].replace(/,/g, "")),
            currency: text.includes("$") || url.includes(".com") ? "USD" :
                      text.includes("¥") || url.includes(".co.jp") ? "JPY" :
                      text.includes("£") || url.includes(".co.uk") ? "GBP" :
                      text.includes("€") || url.includes(".de") ? "EUR" : "USD",
            name: document.querySelector("#productTitle")?.textContent?.trim() || ""
          }
        }
      }
    }
  }

  if (url.includes("shopee")) {
    const priceEl = document.querySelector('div._3e_UQT, div.pqTWkA')
    if (priceEl) {
      const match = priceEl.textContent?.match(/[\d,.]+/)
      if (match) {
        return {
          price: parseFloat(match[0].replace(/,/g, "")),
          currency: "TWD",
          name: document.querySelector('h1')?.textContent?.trim() || ""
        }
      }
    }
  }

  return { price: null, currency: "USD", name: "" }
}

const ProductOverlay = () => {
  const handleAddToMonitor = async () => {
    const url = window.location.href
    const platform = url.includes("amazon") ? "amazon" : "shopee"

    let productId = url
    if (platform === "amazon") {
      const match = url.match(/\/dp\/([A-Z0-9]+)/)
      if (match) productId = match[1]
    }

    // Extract price from the page the user is viewing
    const { price, currency, name } = extractPrice()

    // Send to background to store via API
    chrome.runtime.sendMessage(
      {
        action: "addProduct",
        platform,
        productUrl: url,
        productId,
        productName: name,
        currentPrice: price,
        currency
      },
      (response) => {
        if (response?.error) {
          alert("Error: " + response.error)
        } else {
          alert(`✅ Added "${name || productId}"${price ? ` - $${price.toFixed(2)}` : ""} to SellerFast!`)
        }
      }
    )
  }

  return (
    <button
      onClick={handleAddToMonitor}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        background: "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 18px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 6
      }}>
      📊 Monitor with SellerFast
    </button>
  )
}

export default ProductOverlay
