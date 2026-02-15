import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import CartLink from "./CartLink";
import logoImage from "../Design_base/logo/pl/FineCeramics_pl.png";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "#efe2cf",
        borderBottom: "1px solid #d8c6ad",
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
            fontWeight: 700,
            textDecoration: "none",
            color: "#2b2118",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily:
              'var(--font-title-primary), var(--font-title-alt), "Times New Roman", Times, serif',
            fontSize: 28,
          }}
        >
          <Image src={logoImage} alt="Fajna Ceramika logo" width={42} height={42} />
          Fajna Ceramika
        </Link>

        <nav
          style={{
            display: "flex",
            gap: 10,
            marginLeft: "auto",
            fontFamily:
              'var(--font-title-primary), var(--font-title-alt), "Times New Roman", Times, serif',
          }}
        >
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

const linkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#2b2118",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid transparent",
};
