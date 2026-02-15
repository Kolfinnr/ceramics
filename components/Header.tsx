import Link from "next/link";
import CartLink from "./CartLink";
import LogoMark from "./LogoMark";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "rgba(248,244,238,0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--line)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Link
          href="/"
          style={{ textDecoration: "none", color: "#111", display: "inline-flex", alignItems: "center" }}
        >
          <span style={{ marginRight: 10, display: "inline-flex", alignItems: "center" }}>
            <LogoMark />
          </span>
          <span className="brand-display" style={{ fontSize: 34 }}>
            Fajna Ceramika
          </span>
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
  color: "#30261f",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #ccb7a6",
  background: "#fffaf5",
  fontWeight: 600,
};
