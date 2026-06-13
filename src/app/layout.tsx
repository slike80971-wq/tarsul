/**
 * Tarsul - تراسل | Root Layout
 * Enterprise Encrypted Messaging Platform for Banks & Corporations.
 */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "تراسل — Tarsul | Enterprise Encrypted Messaging",
  description: "منصة مراسلة داخلية مشفرة للمؤسسات والمصارف. End-to-End Encrypted Enterprise Messaging Platform for Banks & Corporations.",
  keywords: ["Tarsul", "تراسل", "E2EE", "encrypted messaging", "enterprise chat", "banking", "Libya"],
  authors: [{ name: "Tarsul Team" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "تراسل — Tarsul",
    description: "منصة مراسلة داخلية مشفرة للمؤسسات والمصارف",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#064e3b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="tarsul-theme"
        >
          {children}
          <Toaster position="top-left" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}