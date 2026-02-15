import Link from "next/link";
import Image from "next/image";
import CartLink from "./CartLink";
import FineCeramicsLogo from "../Design_base/logo/pl/FineCeramics_pl.png";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "rgba(228, 213, 186, 0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #c3ab84",
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
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "#2f241b",
            fontFamily: 'var(--font-title-primary), var(--font-title-alt), "Times New Roman", serif',
            letterSpacing: "0.03em",
            fontSize: 28,
          }}
        >
          <span aria-hidden style={{ display: "inline-flex" }}>
            <Image src={FineCeramicsLogo} alt="Fajna Ceramika logo" width={80} height={80} />
          </span>
          Fajna Ceramika
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
  color: "#2f241b",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid transparent",
  fontFamily: 'var(--font-title-primary), var(--font-title-alt), "Times New Roman", serif',
  letterSpacing: "0.03em",
};
