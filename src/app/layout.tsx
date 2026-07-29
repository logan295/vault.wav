import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { LocalPlaybackProvider } from "@/components/local-playback-provider";
import "./globals.css";

const display = localFont({
  variable: "--font-display",
  src: [
    { path: "../../public/fonts/EamesCenturyModern-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/EamesCenturyModern-Bold.otf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "vault.wav — your lossless library, everywhere.",
  description:
    "A private lossless music library for your WAV collection, playlists, offline listening, and remote playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <LocalPlaybackProvider>{children}</LocalPlaybackProvider>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
