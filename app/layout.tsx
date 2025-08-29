import "./globals.css";
import "@bezalel6/react-chessground/dist/react-chessground.css";
import type { Metadata } from "next";
import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import Header from "@/components/layout/Header";
import ConnectionStatusOverlay from "@/components/ConnectionStatusOverlay";
import WebSocketStatusWidget from "@/components/WebSocketStatusWidget";

export const metadata: Metadata = {
  title: "BanChess",
  description: "Chess with bans - A strategic chess variant",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "any" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "BanChess",
    description: "Chess with bans - A strategic chess variant",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "BanChess",
    description: "Chess with bans - A strategic chess variant",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen">
        <AuthProvider>
          <WebSocketProvider>
            <ConnectionStatusOverlay />
            <WebSocketStatusWidget />
            <Header />

            {/* Main content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
