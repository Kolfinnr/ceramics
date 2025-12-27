import CartView from "@/components/CartView";

export default function CartPage() {
  return (
    <main style={{ padding: "40px 16px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 18 }}>Your cart</h1>
      <CartView />
    </main>
  );
}
