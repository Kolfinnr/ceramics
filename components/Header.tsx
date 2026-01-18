import Link from "next/link";
import CartLink from "./CartLink";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #eee",
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Link
          href="/"
          style={{ fontWeight: 900, textDecoration: "none", color: "#111" }}
        >
          CERAMICS
        </Link>

        <nav style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          <Link href="/" style={linkStyle}>
            Home
          </Link>
          <Link href="/store" style={linkStyle}>
            Store
          </Link>
          <Link href="/about" style={linkStyle}>
            About
          </Link>
          <CartLink style={linkStyle} />
        </nav>
      </div>
    </header>
  );
}

const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#111",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid transparent",
};
