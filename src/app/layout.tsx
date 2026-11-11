import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: process.env.FIRM_NAME || "LedgerPulse", template: `%s · ${process.env.FIRM_NAME || "LedgerPulse"}` },
  description: process.env.FIRM_TAGLINE || "CA Workspace Manager",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1120", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
