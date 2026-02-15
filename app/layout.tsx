import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";

const bebas = localFont({
  src: "../Design_base/fonts/BebasNeue Regular.otf",
  variable: "--font-display",
});

const manfred = localFont({
  src: "../Design_base/fonts/Manfred Modern.ttf",
  variable: "--font-brand",
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
      <body className={`${bebas.variable} ${manfred.variable} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
