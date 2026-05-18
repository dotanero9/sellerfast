import { useState, useEffect, useCallback } from "react"

const API_BASE = "http://localhost:3000/api"

function App() {
  const [products, setProducts] = useState([])
  const [url, setUrl] = useState("")
  const [platform, setPlatform] = useState("amazon")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        headers: { "x-user-id": "default" }
      })
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      // Backend not running - silent fail
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProduct = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "default"
        },
        body: JSON.stringify({ platform, productUrl: url.trim(), productId: url.trim() })
      })

      if (res.status === 409) {
        setError("Already monitoring this product")
      } else if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to add")
      } else {
        setUrl("")
        fetchProducts()
      }
    } catch (err) {
      setError("Cannot connect to backend. Is the server running?")
    } finally {
      setLoading(false)
    }
  }

  const removeProduct = async (id) => {
    try {
      await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": "default" }
      })
      fetchProducts()
    } catch (err) {
      // silent
    }
  }

  const refreshPrice = async (id) => {
    try {
      await fetch(`${API_BASE}/products/${id}/refresh`, {
        method: "POST",
        headers: { "x-user-id": "default" }
      })
      fetchProducts()
    } catch (err) {
      // silent
    }
  }

  const getPriceStatus = (p) => {
    if (!p.latest_price && !p.current_price) return "gray"
    // Simple: if we have a price, show green
    return "green"
  }

  return (
    <div style={{ width: 380, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        📊 SellerFast
      </h1>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
        Cross-border seller daily ops toolkit
      </p>

      {/* Add product form */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
        >
          <option value="amazon">Amazon</option>
          <option value="shopee">Shopee</option>
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addProduct()}
          placeholder="Paste product URL..."
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
        />
        <button
          onClick={addProduct}
          disabled={loading}
          style={{
            padding: "6px 14px",
            background: loading ? "#999" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "default" : "pointer",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap"
          }}
        >
          {loading ? "..." : "+ Add"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Product list */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {products.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", padding: 32, fontSize: 13 }}>
            No products yet. Add one above.
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderBottom: "1px solid #eee",
                gap: 8
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.product_name || p.product_id || p.product_url}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  {p.platform.toUpperCase()} · {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "pending"}
                </div>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: getPriceStatus(p) === "green" ? "#16a34a" : "#999", whiteSpace: "nowrap" }}>
                {p.latest_price || p.current_price
                  ? `$${Number(p.latest_price || p.current_price).toFixed(2)}`
                  : "—"}
              </div>

              <button
                onClick={() => refreshPrice(p.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 4
                }}
                title="Refresh price"
              >
                🔄
              </button>

              <button
                onClick={() => removeProduct(p.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#dc2626",
                  padding: 4
                }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, fontSize: 10, color: "#aaa", textAlign: "center" }}>
        SellerFast v0.1 · Free up to 5 products
      </div>
    </div>
  )
}

export default App
