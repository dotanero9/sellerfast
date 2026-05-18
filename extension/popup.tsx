import { useState, useEffect, useCallback } from "react"

const API_BASE = "http://10.3.0.15:3000/api"
const PRO_CHECKOUT = "https://sellerfast.lemonsqueezy.com/checkout"

type Tab = "price" | "review" | "translate"

function App() {
  const [tab, setTab] = useState<Tab>("price")

  return (
    <div style={{ width: 400, fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>📊 SellerFast</h1>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>v0.1</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", margin: "12px 16px 0" }}>
        {([
          ["price", "💰 价格"],
          ["review", "⭐ 评价"],
          ["translate", "🌐 翻译"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: tab === key ? 600 : 400,
              color: tab === key ? "#2563eb" : "#64748b",
              background: "none",
              border: "none",
              borderBottom: tab === key ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
            }}>
            {label}
          </button>
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

// ========== Price Tab ==========

function PriceTab() {
  const [products, setProducts] = useState([])
  const [url, setUrl] = useState("")
  const [platform, setPlatform] = useState("amazon")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/products`, { headers: { "x-user-id": "default" } })
      setProducts(await res.json())
    } catch {}
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const addProduct = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "default" },
        body: JSON.stringify({ platform, productUrl: url.trim(), productId: url.trim() })
      })
      if (res.status === 409) setError("Already monitoring")
      else if (!res.ok) setError((await res.json()).error || "Failed")
      else { setUrl(""); fetchProducts() }
    } catch { setError("Backend not running on localhost:3000") }
    finally { setLoading(false) }
  }

  const removeProduct = async (id: number) => {
    await fetch(`${API_BASE}/products/${id}`, { method: "DELETE", headers: { "x-user-id": "default" } })
    fetchProducts()
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <select value={platform} onChange={e => setPlatform(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}>
          <option value="amazon">Amazon</option>
          <option value="shopee">Shopee</option>
        </select>
        <input type="text" value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addProduct()}
          placeholder="Paste product URL..."
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }} />
        <button onClick={addProduct} disabled={loading}
          style={{ padding: "6px 14px", background: loading ? "#999" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
          {loading ? "..." : "+ Add"}
        </button>
      </div>

      {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 12 }}>{error}</div>}

      {products.length === 0 ? (
        <div style={{ textAlign: "center", color: "#999", padding: 32, fontSize: 13 }}>No products yet. Add one above.</div>
      ) : (
        products.map((p: any) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid #eee", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name || p.product_id}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{p.platform.toUpperCase()} · {p.updated_at?.slice(0, 10) || "pending"}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: p.current_price ? "#16a34a" : "#999", whiteSpace: "nowrap" }}>
              {p.current_price ? `$${Number(p.current_price).toFixed(2)}` : "—"}
            </div>
            <button onClick={() => removeProduct(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14 }}>✕</button>
          </div>
        ))
      )}
    </div>
  )
}

// ========== Review Tab ==========

function ReviewTab() {
  const [asin, setAsin] = useState("")
  const [reviews, setReviews] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyze = async () => {
    if (!asin.trim() || !reviews.trim()) return
    setLoading(true)
    setError("")
    setResult("")
    try {
      const parsed = reviews.split("\n").filter(Boolean).map(line => {
        const parts = line.split("|")
        return { rating: parseInt(parts[0]) || 0, title: parts[1]?.trim() || "", body: parts[2]?.trim() || "" }
      })
      const res = await fetch(`${API_BASE}/ai/analyze-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: asin, reviews: parsed })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data.analysis)
    } catch { setError("Cannot connect to backend") }
    finally { setLoading(false) }
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>粘贴评价数据，AI 自动提取差评关键词和产品改进建议</p>

      <input type="text" value={asin} onChange={e => setAsin(e.target.value)}
        placeholder="Product name or ASIN"
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />

      <textarea value={reviews} onChange={e => setReviews(e.target.value)}
        placeholder="Paste reviews, one per line:&#10;1 | Great product | Love the color and quality&#10;2 | Too small | Had to return it"
        rows={6}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12, resize: "vertical", fontFamily: "monospace", boxSizing: "border-box" }} />

      <button onClick={analyze} disabled={loading || !asin || !reviews}
        style={{ width: "100%", marginTop: 8, padding: "10px", background: loading ? "#999" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        {loading ? "Analyzing..." : "🔍 Analyze Reviews"}
      </button>

      {error && <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", borderRadius: 6, fontSize: 12, color: "#dc2626" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 6, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #e2e8f0", maxHeight: 300, overflowY: "auto" }}>
          {result}
        </div>
      )}
    </div>
  )
}

// ========== Translate Tab ==========

function TranslateTab() {
  const [text, setText] = useState("")
  const [languages, setLanguages] = useState(["en", "ja", "de"])
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const translate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError("")
    setResult("")
    try {
      const res = await fetch(`${API_BASE}/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languages })
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data.translation)
    } catch { setError("Cannot connect to backend") }
    finally { setLoading(false) }
  }

  const toggleLang = (lang: string) => {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])
  }

  const langLabels: Record<string, string> = { en: "英语", ja: "日语", de: "德语", fr: "法语", es: "西班牙语" }

  return (
    <div>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>中文 Listing 一键翻译为多语种，保留营销语气</p>

      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="输入中文 Listing 文案，例如：&#10;2025新款男士透气跑步鞋&#10;轻量减震运动鞋 网面透气"
        rows={4}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />

      <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
        {Object.entries(langLabels).map(([key, label]) => (
          <button key={key} onClick={() => toggleLang(key)}
            style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer",
              background: languages.includes(key) ? "#2563eb" : "#f1f5f9",
              color: languages.includes(key) ? "#fff" : "#64748b",
              border: languages.includes(key) ? "1px solid #2563eb" : "1px solid #e2e8f0"
            }}>{label}</button>
        ))}
      </div>

      <button onClick={translate} disabled={loading || !text.trim() || languages.length === 0}
        style={{ width: "100%", padding: "10px", background: loading ? "#999" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        {loading ? "Translating..." : "🌐 Translate"}
      </button>

      {error && <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", borderRadius: 6, fontSize: 12, color: "#dc2626" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 6, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #e2e8f0", maxHeight: 300, overflowY: "auto" }}>
          {result}
        </div>
      )}
    </div>
  )
}

export default App
