"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart-storage";

export default function CheckoutSuccessPage() {
  useEffect(() => {
    clearCart();
  }, []);

  return (
    <main style={{ padding: "40px 16px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Payment successful</h1>
      <p style={{ fontSize: 18, color: "#444" }}>
        Thank you! We have received your payment and are preparing your order.
      </p>
      <a href="/store" style={{ display: "inline-block", marginTop: 24, color: "#111" }}>
        Back to store
      </a>
    </main>
  );
}
