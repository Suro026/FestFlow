import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/**
 * Root layout.
 *
 * Loaded through next/font rather than a Google Fonts `@import`, which is what
 * the Vite project used: next/font self-hosts the files and reserves the
 * metrics, so the page no longer reflows when the webfont lands.
 */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "FestFlow — Smart Multi-Fest Event Management",
    template: "%s · FestFlow",
  },
  description:
    "Run college fests end to end: registrations, QR check-in, food distribution, " +
    "results and certificates, in one place.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "FestFlow",
    description: "Smart multi-fest event management for colleges.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        {/*
          Material Symbols is used by the ported screens for inline icons.
          preconnect first so the request is not stuck behind DNS + TLS.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
          eslint-disable-next-line @next/next/no-page-custom-font --
          The rule warns about fonts added outside pages/_document.js, which
          would load them per-page. In the App Router this file *is* the
          document, so the stylesheet is shared across every route. Worth
          revisiting during the redesign: these 55 icon usages could move to
          lucide-react, which is already a dependency, and drop this
          render-blocking request altogether.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
