import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header"; // <- adjust path if needed

const titleFont = localFont({
  src: [
    {
      path: "../Design_base/fonts/Manfred Modern.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../Design_base/fonts/Manfred Modern_eng.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-title-primary",
  display: "swap",
});

const titleFontAlt = localFont({
  src: "../Design_base/fonts/BebasNeue Regular.otf",
  weight: "400",
  style: "normal",
  variable: "--font-title-alt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fajna Ceramika",
  description: "Handmade ceramics store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${titleFont.variable} ${titleFontAlt.variable} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
