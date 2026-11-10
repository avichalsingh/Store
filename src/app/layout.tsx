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
    default:
      "PRAGVI — Buy AI Dance Videos & Creative Assets for Social Media",
    template: "%s · PRAGVI",
  },
  description:
    "Buy AI dance videos for Instagram Reels, ready-to-use AI videos for social media, AI images, and prompts. PRAGVI is a premium AI content marketplace for influencers, marketers, and agencies.",
  applicationName: "PRAGVI",
  keywords: [
    "buy AI dance videos",
    "AI dance videos for Instagram Reels",
    "ready-to-use AI videos for social media",
    "AI-generated videos for content creators",
    "AI images for social media",
    "AI prompts for content creation",
    "AI content marketplace",
    "social media content creation resources",
  ],
  openGraph: {
    title: "PRAGVI — AI Content Marketplace for Creators",
    description:
      "Ready-to-use AI dance videos, images, and prompts for Instagram Reels, Shorts, and campaigns.",
    siteName: "PRAGVI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PRAGVI — Buy AI Dance Videos for Social Media",
    description:
      "An AI content marketplace with ready-to-use dance videos, images, and prompts for creators.",
  },
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
