export default function CheckoutCancelPage() {
  return (
    <main style={{ padding: "40px 16px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Checkout canceled</h1>
      <p style={{ fontSize: 18, color: "#444" }}>
        Your payment was not completed. If you still want the item, you can try again.
      </p>
      <a href="/store" style={{ display: "inline-block", marginTop: 24, color: "#111" }}>
        Back to store
      </a>
    </main>
  );
}
