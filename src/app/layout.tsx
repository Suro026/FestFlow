import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/**
 * Root layout.
 *
 * Inter is the design system's one typeface, for headings and body alike.
 * next/font self-hosts it and reserves the metrics, so nothing reflows when
 * the font lands.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "FestFlow — Every fest. One pass.",
    template: "%s · FestFlow",
  },
  description:
    "Find fests near you, register with your team in one go, and keep every ticket, " +
    "meal slot and certificate in one place. Colleges run the whole thing from the " +
    "other side of the same app.",
  applicationName: "FestFlow",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    siteName: "FestFlow",
    title: "FestFlow — Every fest. One pass.",
    description: "Register once, show a QR, done. Certificates anyone can verify.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#161826",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
