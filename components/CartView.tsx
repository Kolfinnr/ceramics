"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  CartItem,
  clearCart,
  readCart,
  removeFromCart,
  subscribeToCartChanges,
} from "@/lib/cart-storage";

type DeliveryMethod = "courier" | "inpost";

type CustomerInfo = {
  email: string;
  phone: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
};

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function CartView() {
  const [items, setItems] = useState<CartItem[]>(() => readCart());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("courier");
  const [customer, setCustomer] = useState<CustomerInfo>({
    email: "",
    phone: "",
    name: "",
    street: "",
    postalCode: "",
    city: "",
  });
  const resetClientSecret = () => setClientSecret(null);

  const isAddressValid = Boolean(
    customer.street.trim() &&
      customer.city.trim() &&
      customer.postalCode.trim()
  );
  const canCreateIntent =
    items.length > 0 &&
    customer.email.trim().length > 0 &&
    customer.phone.trim().length > 0 &&
    isAddressValid;

  useEffect(
    () =>
      subscribeToCartChanges(() => {
        setItems(readCart());
        setClientSecret(null);
      }),
    []
  );

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.pricePLN, 0);
  }, [items]);

  const handleRemove = (slug: string) => {
    setItems(removeFromCart(slug));
    resetClientSecret();
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);
    setIntentError(null);

    try {
      const response = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productSlug: item.productSlug,
            productName: item.productName,
            pricePLN: item.pricePLN,
          })),
          deliveryMethod,
          customer: {
            email: customer.email,
            phone: customer.phone,
            name: customer.name,
            street: customer.street,
            postalCode: customer.postalCode,
            city: customer.city,
            country: "PL",
          },
        }),
      });

      const data = (await response.json()) as {
        clientSecret?: string;
        error?: string;
      };

      if (!response.ok || !data.clientSecret) {
        setIntentError(data.error ?? "Unable to start checkout.");
        setIsLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Checkout error:", error);
      setIntentError("Unable to start checkout.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const handleClear = () => {
    clearCart();
    setItems([]);
    setClientSecret(null);
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
                    resetClientSecret();
                  }}
                />
                Courier (delivery to address)
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="radio"
                  checked={deliveryMethod === "inpost"}
                  onChange={() => {
                    setDeliveryMethod("inpost");
                    resetClientSecret();
                  }}
                />
                InPost Paczkomat
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={handleCheckout}
                disabled={isLoading || !canCreateIntent}
                style={{
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "12px 18px",
                  cursor:
                    isLoading || !canCreateIntent ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: isLoading || !canCreateIntent ? 0.7 : 1,
                }}
                title={
                  !canCreateIntent
                    ? "Complete customer details to continue"
                    : undefined
                }
              >
                {isLoading ? "Preparing payment..." : "Continue to payment"}
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
            {intentError && (
              <p style={{ color: "#b00", fontWeight: 600 }}>{intentError}</p>
            )}
          </div>

          <div style={{ display: "grid", gap: 12, borderTop: "1px solid #eee", paddingTop: 16 }}>
            <div style={{ fontWeight: 800 }}>Customer details</div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Email *</span>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => {
                    setCustomer({ ...customer, email: e.target.value });
                    resetClientSecret();
                  }}
                  style={inputStyle}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Phone *</span>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => {
                    setCustomer({ ...customer, phone: e.target.value });
                    resetClientSecret();
                  }}
                  style={inputStyle}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Name</span>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => {
                    setCustomer({ ...customer, name: e.target.value });
                    resetClientSecret();
                  }}
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>
                  {deliveryMethod === "inpost" ? "Adres Paczkomatu" : "Adres dostawy"}
                </span>
                {deliveryMethod === "inpost" && (
                  <span style={{ fontSize: 13, color: "#555" }}>
                    Wpisz adres Paczkomatu
                  </span>
                )}
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Street *</span>
                <input
                  type="text"
                  value={customer.street}
                  onChange={(e) => {
                    setCustomer({ ...customer, street: e.target.value });
                    resetClientSecret();
                  }}
                  style={inputStyle}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>City *</span>
                <input
                  type="text"
                  value={customer.city}
                  onChange={(e) => {
                    setCustomer({ ...customer, city: e.target.value });
                    resetClientSecret();
                  }}
                  style={inputStyle}
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Postal code *</span>
                <input
                  type="text"
                  value={customer.postalCode}
                  onChange={(e) => {
                    setCustomer({ ...customer, postalCode: e.target.value });
                    resetClientSecret();
                  }}
                  style={inputStyle}
                  required
                />
              </label>
            </div>
          </div>

          {clientSecret && stripePromise && (
            <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: "stripe" } }}
              >
                <PaymentSection />
              </Elements>
            </div>
          )}
          {clientSecret && !stripePromise && (
            <p style={{ color: "#b00", fontWeight: 600 }}>
              Missing Stripe publishable key.
            </p>
          )}

        </>
      )}
    </section>
  );
}

function PaymentSection() {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setPaymentError(null);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${origin}/checkout/success`,
      },
    });

    if (result.error) {
      setPaymentError(result.error.message ?? "Payment failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        style={{
          border: "1px solid #111",
          background: "#111",
          color: "#fff",
          borderRadius: 12,
          padding: "12px 18px",
          cursor: !stripe || !elements || isSubmitting ? "not-allowed" : "pointer",
          fontWeight: 700,
          opacity: !stripe || !elements || isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? "Processing..." : "Pay now"}
      </button>
      {paymentError && (
        <p style={{ color: "#b00", fontWeight: 600 }}>{paymentError}</p>
      )}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};
