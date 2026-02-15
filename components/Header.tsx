import Link from "next/link";
import CartLink from "./CartLink";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "rgba(237, 226, 205, 0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #d8c7a8",
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 3C9.8 3 8 4.8 8 7V9.7C6.2 10.9 5 13 5 15.4C5 19 8 22 12 22C16 22 19 19 19 15.4C19 13 17.8 10.9 16 9.7V7C16 4.8 14.2 3 12 3Z"
                fill="#8a6d48"
              />
              <path
                d="M12 5.2C10.9 5.2 10 6.1 10 7.2V9.1C10.6 8.9 11.3 8.8 12 8.8C12.7 8.8 13.4 8.9 14 9.1V7.2C14 6.1 13.1 5.2 12 5.2Z"
                fill="#f4ecdf"
              />
            </svg>
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
