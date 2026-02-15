import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";

const manfredModern = localFont({
  src: "../Design_base/fonts/Manfred Modern_eng.ttf",
  variable: "--font-manfred-modern",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fine Ceramics",
  description: "Handmade ceramics store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${manfredModern.variable} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
