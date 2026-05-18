import { useState, useEffect, useCallback } from "react"

const API = "http://43.128.117.46:3000/api"

type Tab = "price" | "review" | "translate"

function App() {
  const [tab, setTab] = useState<Tab>("price")
  return (
    <div style={{ width: 400, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>📊 SellerFast</h1>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>v0.3</span>
      </div>
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", margin: "12px 16px 0" }}>
        {(["price", "review", "translate"] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as Tab)}
            style={{
              flex: 1, padding: "8px 0", fontSize: 13, fontWeight: tab === k ? 600 : 400,
              color: tab === k ? "#2563eb" : "#64748b", background: "none", border: "none",
              borderBottom: tab === k ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: -2, cursor: "pointer"
            }}>{l}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {tab === "price" && <PriceTab />}
        {tab === "review" && <ReviewTab />}
        {tab === "translate" && <TranslateTab />}
      </div>
    </div>
  )
}

// ══════ Price Tab ══════

function PriceTab() {
  const [products, setProducts] = useState<any[]>([])
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`${API}/products`, { headers: { "x-user-id": "default" } })
      if (res.ok) setProducts(await res.json())
    } catch { /* backend might be down */ }
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const add = async () => {
    const u = url.trim()
    if (!u) return
    setLoading(true)
    setMsg("")

    const platform = u.includes("shopee") ? "shopee" : "amazon"
    try {
      const res = await fetch(`${API}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "default" },
        body: JSON.stringify({ platform, productUrl: u, productId: u })
      })
      const data = await res.json()
      if (res.ok) {
        setMsg("✅ Added. Price will be checked by background worker.")
        setUrl("")
        fetchList()
      } else if (res.status === 409) {
        setMsg("Already monitoring this product")
      } else {
        setMsg("Error: " + (data.error || "Unknown"))
      }
    } catch {
      setMsg("Error: Cannot reach server (43.128.117.46:3000)")
    }
    setLoading(false)
  }

  const remove = async (id: number) => {
    await fetch(`${API}/products/${id}`, { method: "DELETE", headers: { "x-user-id": "default" } })
    fetchList()
  }

  const refreshAll = async () => {
    const list = [...products]
    if (list.length === 0) return
    setMsg(`Opening ${list.length} product page(s) in tabs to extract prices...`)

    let updated = 0
    for (const p of list) {
      try {
        // Open product page in a background tab (real browser tab → Shopee can't block)
        const tab = await chrome.tabs.create({ url: p.product_url, active: false })

        // Wait for page to load (including JS)
        await new Promise<void>((resolve) => {
          const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener)
              resolve()
            }
          }
          chrome.tabs.onUpdated.addListener(listener)
          // Timeout after 15 seconds
          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener)
            resolve()
          }, 15000)
        })

        // Extract price from the loaded page DOM
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: () => {
            const url = window.location.href
            // Amazon
            if (url.includes("amazon")) {
              const selectors = ['.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice', '#corePrice_desktop .a-price .a-offscreen']
              for (const sel of selectors) {
                const el = document.querySelector(sel)
                if (el?.textContent) {
                  const m = el.textContent.match(/[\d,.]+/)
                  if (m) return { price: parseFloat(m[0].replace(/,/g, "")), name: (document.querySelector("#productTitle") as any)?.textContent?.trim() || "" }
                }
              }
            }
            // Shopee
            if (url.includes("shopee")) {
              const priceEl = document.querySelector('div.pqTWkA, div._3e_UQT')
              if (priceEl?.textContent) {
                const m = priceEl.textContent.match(/[\d,.]+/)
                if (m) return { price: parseFloat(m[0].replace(/,/g, "")), name: document.querySelector("h1")?.textContent?.trim() || "" }
              }
            }
            return null
          }
        })

        // Close the tab
        chrome.tabs.remove(tab.id!)

        // Save price if found
        const extracted = results?.[0]?.result
        if (extracted?.price) {
          await fetch(`${API}/products/${p.id}/price`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": "default" },
            body: JSON.stringify({ price: extracted.price, currency: "USD" })
          })
          updated++
          setMsg(`Done: ${updated}/${list.length}`)
        }
      } catch (e: any) {
        console.error("Check failed for", p.product_url, e.message)
      }
    }

    setMsg(`Done! ${updated} of ${list.length} products updated.`)
    fetchList()
  }

  const pricedCount = products.filter((p: any) => p.current_price).length

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input type="text" value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Paste Amazon / Shopee product URL..."
          style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }} />
        <button onClick={add} disabled={loading}
          style={{ padding: "8px 16px", background: loading ? "#999" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
          {loading ? "..." : "+ Add"}
        </button>
      </div>

      {msg && (
        <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 12,
          background: msg.startsWith("Error") ? "#fef2f2" : "#f0fdf4",
          color: msg.startsWith("Error") ? "#dc2626" : "#16a34a" }}>
          {msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{products.length} products · {pricedCount} with prices</span>
        <button onClick={refreshAll} style={{ fontSize: 11, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, padding: "3px 10px", cursor: "pointer", color: "#64748b" }}>🔄 Refresh All</button>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: "center", color: "#999", padding: 40, fontSize: 13 }}>
          <p>Paste a competitor's product URL above</p>
          <p style={{ fontSize: 11, marginTop: 8 }}>Background worker checks prices every 60 minutes</p>
        </div>
      ) : (
        products.map((p: any) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #eee", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.platform === "amazon" && p.product_id?.match(/^[A-Z0-9]{10}$/) ? `ASIN: ${p.product_id}` : (p.product_name || p.product_id)?.substring(0, 50)}
              </div>
              <div style={{ fontSize: 10, color: "#888" }}>{p.platform?.toUpperCase()} · {p.current_price ? new Date(p.updated_at).toLocaleDateString() : "no price yet"}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: p.current_price ? "#16a34a" : "#94a3b8", whiteSpace: "nowrap", minWidth: 60, textAlign: "right" }}>
              {p.current_price ? `$${Number(p.current_price).toFixed(2)}` : "—"}
            </div>
            <button onClick={() => remove(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 16, padding: 4 }}>✕</button>
          </div>
        ))
      )}
    </div>
  )
}

// ══════ Review Tab ══════

function ReviewTab() {
  const [asin, setAsin] = useState("")
  const [reviews, setReviews] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyze = async () => {
    setLoading(true); setError(""); setResult("")
    try {
      const parsed = reviews.split("\n").filter(Boolean).map(line => {
        const parts = line.split("|")
        return { rating: parseInt(parts[0]) || 0, title: parts[1]?.trim() || "", body: parts[2]?.trim() || "" }
      })
      const res = await fetch(`${API}/ai/analyze-reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: asin, reviews: parsed })
      })
      const data = await res.json()
      data.error ? setError(data.error) : setResult(data.analysis)
    } catch { setError("Cannot connect to backend") }
    setLoading(false)
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Paste negative reviews, AI extracts key issues</p>
      <input type="text" value={asin} onChange={e => setAsin(e.target.value)} placeholder="Product ASIN or name" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
      <textarea value={reviews} onChange={e => setReviews(e.target.value)} placeholder="One review per line: rating | title | body" rows={6} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" }} />
      <button onClick={analyze} disabled={loading} style={{ width: "100%", marginTop: 8, padding: "10px", background: loading ? "#999" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{loading ? "Analyzing..." : "Analyze Reviews"}</button>
      {error && <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", borderRadius: 6, fontSize: 12, color: "#dc2626" }}>{error}</div>}
      {result && <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 6, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #e2e8f0", maxHeight: 300, overflowY: "auto" }}>{result}</div>}
    </div>
  )
}

// ══════ Translate Tab ══════

function TranslateTab() {
  const [text, setText] = useState("")
  const [languages, setLanguages] = useState(["en", "ja", "de"])
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const translate = async () => {
    setLoading(true); setError(""); setResult("")
    try {
      const res = await fetch(`${API}/ai/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languages })
      })
      const data = await res.json()
      data.error ? setError(data.error) : setResult(data.translation)
    } catch { setError("Cannot connect to backend") }
    setLoading(false)
  }

  const toggle = (l: string) => setLanguages(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const labels: Record<string, string> = { en: "EN 英语", ja: "JA 日语", de: "DE 德语", fr: "FR 法语", es: "ES 西班牙语" }

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter Chinese listing text..." rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
        {Object.entries(labels).map(([k, v]) => (
          <button key={k} onClick={() => toggle(k)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", background: languages.includes(k) ? "#2563eb" : "#f1f5f9", color: languages.includes(k) ? "#fff" : "#64748b", border: languages.includes(k) ? "1px solid #2563eb" : "1px solid #e2e8f0" }}>{v}</button>
        ))}
      </div>
      <button onClick={translate} disabled={loading || !text.trim()} style={{ width: "100%", padding: "10px", background: loading ? "#999" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{loading ? "Translating..." : "Translate"}</button>
      {error && <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", borderRadius: 6, fontSize: 12, color: "#dc2626" }}>{error}</div>}
      {result && <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 6, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #e2e8f0", maxHeight: 300, overflowY: "auto" }}>{result}</div>}
    </div>
  )
}

// ══════ Browser-side price fetcher ══════
// Runs from the extension popup context, which has the user's real cookies and IP.
// This is fundamentally different from server-side scraping.

async function fetchPriceFromBrowser(url: string, platform: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": navigator.userAgent,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US;q=0.9",
      },
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return null

    const html = await res.text()

    if (platform === "amazon" || url.includes("amazon")) {
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

    if (platform === "shopee" || url.includes("shopee")) {
      // Shopee embeds price data in <script> tags as JSON
      const m = html.match(/"price"\s*:\s*(\d+)/)
      if (m) return parseInt(m[1]) / 100000
      const m2 = html.match(/"price_before_discount"\s*:\s*(\d+)/)
      if (m2) return parseInt(m2[1]) / 100000
      const m3 = html.match(/"price_min"\s*:\s*(\d+)/)
      if (m3) return parseInt(m3[1]) / 100000
    }

    return null
  } catch {
    return null
  }
}

export default App
