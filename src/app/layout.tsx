import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { LocalPlaybackProvider } from "@/components/local-playback-provider";
import "./globals.css";

const circular = localFont({
  src: "../../public/fonts/CircularStd-Book.otf",
  variable: "--font-vault",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
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
      className={`${circular.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <LocalPlaybackProvider>{children}</LocalPlaybackProvider>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
