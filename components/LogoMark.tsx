export default function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      {/* Add the logo file at public/brand-logo.png */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand-logo.png" alt="" />
    </span>
  );
}
