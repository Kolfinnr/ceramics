"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartItem,
  clearCart,
  readCart,
  removeFromCart,
  subscribeToCartChanges,
} from "@/lib/cart-storage";

export default function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCart());
    return subscribeToCartChanges(() => setItems(readCart()));
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.pricePLN, 0);
  }, [items]);

  const handleRemove = (slug: string) => {
    setItems(removeFromCart(slug));
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productSlug: item.productSlug,
            productName: item.productName,
            pricePLN: item.pricePLN,
          })),
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setErrorMessage(data.error ?? "Unable to start checkout.");
        setIsLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage("Unable to start checkout.");
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    clearCart();
    setItems([]);
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      {items.length === 0 ? (
        <p style={{ fontSize: 18, color: "#444" }}>
          Your cart is empty. Browse the store to add items.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.productSlug}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                  padding: 12,
                  border: "1px solid #eee",
                  borderRadius: 14,
                }}
              >
                {item.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photo}
                    alt={item.productName}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #eee",
                    }}
                  />
                )}
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>{item.productName}</strong>
                  <span style={{ color: "#555" }}>{item.pricePLN} PLN</span>
                  <a href={`/store/${item.productSlug}`} style={{ color: "#111" }}>
                    View item
                  </a>
                </div>
                <button
                  onClick={() => handleRemove(item.productSlug)}
                  style={{
                    border: "1px solid #111",
                    background: "transparent",
                    borderRadius: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: "1px solid #eee",
              paddingTop: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 18 }}>
              Total: <strong>{total} PLN</strong>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                style={{
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "12px 18px",
                  cursor: "pointer",
                  fontWeight: 700,
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? "Redirecting..." : "Checkout"}
              </button>
              <button
                onClick={handleClear}
                style={{
                  border: "1px solid #111",
                  background: "transparent",
                  color: "#111",
                  borderRadius: 12,
                  padding: "12px 18px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Clear cart
              </button>
            </div>
            {errorMessage && (
              <p style={{ color: "#b00", fontWeight: 600 }}>{errorMessage}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
