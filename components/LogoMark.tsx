export default function LogoMark() {
  return (
    <span
      className="logo-mark"
      aria-hidden="true"
      style={{ width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Place your new logo at /public/brand-logo.png */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand-logo.png"
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
