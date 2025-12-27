"use client";

import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";

export default function StoreGridClient({ products }: { products: any[] }) {
  const [showSold, setShowSold] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const cats = p?.content?.category;
      if (Array.isArray(cats)) cats.forEach((c: string) => set.add(c));
    }
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const available = p?.content?.status !== false;
      const cats = Array.isArray(p?.content?.category) ? p.content.category : [];

      if (!showSold && !available) return false;
      if (category !== "all" && !cats.includes(category)) return false;

      return true;
    });
  }, [products, showSold, category]);

  return (
    <div style={{ marginTop: 18 }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showSold}
            onChange={(e) => setShowSold(e.target.checked)}
          />
          <span>Show sold</span>
        </label>

        <div style={{ marginLeft: "auto", color: "#555" }}>
          Showing <strong>{filtered.length}</strong> item(s)
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((p: any) => (
          <ProductCard
            key={p.uuid}
            product={{
              name: p.name,
              slug: p.slug,
              content: p.content,
            }}
          />
        ))}
      </div>
    </div>
  );
}
