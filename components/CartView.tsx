"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartItem,
  clearCart,
  readCart,
  removeFromCart,
  subscribeToCartChanges,
} from "@/lib/cart-storage";

type DeliveryMethod = "courier" | "inpost";

type InpostPoint = {
  id?: string;
  name?: string;
  address?: string;
  [key: string]: unknown;
};

export default function CartView() {
  const [items, setItems] = useState<CartItem[]>(() => readCart());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("courier");
  const [inpostPoint, setInpostPoint] = useState<InpostPoint | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const needsPoint = deliveryMethod === "inpost";
  const canCheckout = !needsPoint || !!inpostPoint;

  useEffect(() => subscribeToCartChanges(() => setItems(readCart())), []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.pricePLN, 0);
  }, [items]);

  const handleRemove = (slug: string) => {
    setItems(removeFromCart(slug));
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    // If user chose InPost but did not select a locker, block checkout
    if (!canCheckout) {
      setErrorMessage("Please choose an InPost Paczkomat before checkout.");
      return;
    }

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
          deliveryMethod,
          inpostPoint, // will be null for courier; OK
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setErrorMessage(data.error ?? "Unable to start checkout.");
        setIsLoading(false);
        return;
      }

      window.location.assign(data.url);
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
                  <Link
                    href={`/store/${item.productSlug}`}
                    style={{ color: "#111" }}
                  >
                    View item
                  </Link>
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

            {/* Delivery section (this was accidentally injected INSIDE the Clear cart button tag before) */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Delivery</div>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="radio"
                  checked={deliveryMethod === "courier"}
                  onChange={() => {
                    setDeliveryMethod("courier");
                    setInpostPoint(null);
                  }}
                />
                Courier (delivery to address)
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="radio"
                  checked={deliveryMethod === "inpost"}
                  onChange={() => setDeliveryMethod("inpost")}
                />
                InPost Paczkomat
              </label>

              {deliveryMethod === "inpost" && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    style={{
                      border: "1px solid #111",
                      background: "transparent",
                      borderRadius: 10,
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {inpostPoint ? "Change Paczkomat" : "Choose Paczkomat"}
                  </button>

                  {inpostPoint && (
                    <div style={{ color: "#444" }}>
                      Selected:{" "}
                      <strong>
                        {inpostPoint.name ?? inpostPoint.id ?? "Paczkomat"}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={handleCheckout}
                disabled={isLoading || !canCheckout}
                style={{
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "12px 18px",
                  cursor: isLoading || !canCheckout ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: isLoading || !canCheckout ? 0.7 : 1,
                }}
                title={
                  !canCheckout
                    ? "Choose an InPost Paczkomat to continue"
                    : undefined
                }
              >
                {isLoading ? "Redirecting..." : "Checkout"}
              </button>

              <button
                onClick={handleClear}
                type="button"
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

          <InpostPointPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(p) => setInpostPoint(p)}
          />
        </>
      )}
    </section>
  );
}

/**
 * TEMP STUB so the build passes.
 * Replace this with the real InPost GeoWidget modal later.
 */
function InpostPointPickerModal(props: {
  open: boolean;
  onClose: () => void;
  onSelect: (p: InpostPoint) => void;
}) {
  const { open, onClose, onSelect } = props;
  const [value, setValue] = useState("");

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "#fff",
          borderRadius: 16,
          padding: 16,
          display: "grid",
          gap: 12,
          border: "1px solid #eee",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Choose Paczkomat (temporary)
        </div>

        <div style={{ color: "#444" }}>
          Temporary picker: paste an InPost point ID or name (you’ll replace this
          with GeoWidget).
        </div>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. WAW01M or 'Warsaw Central'"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #111",
              background: "transparent",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!value.trim()) return;
              onSelect({ id: value.trim(), name: value.trim() });
              onClose();
            }}
            style={{
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
              opacity: value.trim() ? 1 : 0.6,
            }}
            disabled={!value.trim()}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
