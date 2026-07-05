import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amazon Jobs Monitor — AI-Powered Hourly Job Alerts for Amazon UK",
  description:
    "Get instant email alerts when new Amazon UK hourly jobs appear. AI-powered scanning every 5 minutes. No CV required positions. Free forever.",
  keywords: [
    "Amazon UK jobs",
    "hourly jobs Amazon",
    "warehouse jobs Amazon UK",
    "Amazon fulfillment jobs",
    "Amazon jobs no CV",
    "Amazon jobs monitor",
    "job alerts",
  ],
  authors: [{ name: "Amazon Jobs Monitor" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>",
  },
  openGraph: {
    title: "Amazon Jobs Monitor — Never Miss an Hourly Job",
    description:
      "AI monitors Amazon UK jobs 24/7. Get email alerts for warehouse & fulfillment hourly positions. No CV needed.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}