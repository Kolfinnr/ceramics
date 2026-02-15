import Image from "next/image";
import Link from "next/link";
import CartLink from "./CartLink";
import fineCeramicsLogo from "../Design_base/logo/eng/FineCeramics_eng.png";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "rgba(250, 244, 232, 0.94)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #d9ccb2",
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
          gap: 14,
        }}
      >
        <Link
          href="/"
          aria-label="Fajna Ceramika home"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <Image src={fineCeramicsLogo} alt="Fajna Ceramika" priority style={{ height: "52px", width: "auto" }} />
          <span style={{ color: "#4a3822", fontSize: 24, letterSpacing: "0.04em" }}>Fajna Ceramika</span>
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
  color: "#4a3822",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid transparent",
};
