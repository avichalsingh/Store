import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { ThemeScript } from "@/components/theme/ThemeScript";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RHYTHM — AI Character Dance Videos",
    template: "%s · RHYTHM",
  },
  description:
    "Discover and purchase premium AI-generated character dance videos. Browse characters, collections, and viral moves.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-bg font-body antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
