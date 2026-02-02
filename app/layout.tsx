import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GTA Equity Tracker | Track Your Home Equity",
  description:
    "Market-based equity estimates using GTA real estate data from 1996–present. Get a clear picture of your home's current value and equity.",
  keywords: [
    "GTA home equity",
    "Toronto real estate",
    "home value estimate",
    "equity calculator",
    "GTA property value",
  ],
  authors: [{ name: "GTA Equity Tracker" }],
  openGraph: {
    title: "GTA Equity Tracker | Track Your Home Equity",
    description:
      "Market-based equity estimates using GTA real estate data from 1996–present.",
    type: "website",
    locale: "en_CA",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0F14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
