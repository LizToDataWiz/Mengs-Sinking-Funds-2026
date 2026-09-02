import type { Metadata, Viewport } from "next";
import { Comic_Neue } from "next/font/google";
import "./globals.css";

const comicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-comic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mengs Sinking Fund",
  description: "Private member portal for contributions, loans and fund shares.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${comicNeue.variable} antialiased`}>{children}</body>
    </html>
  );
}
