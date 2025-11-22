import "./globals.css";
import "@bezalel6/react-chessground/dist/react-chessground.css";
import type { Metadata } from "next";
import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { GameProvider } from "@/contexts/GameContext";
import { ToastProvider } from "@/lib/toast/toast-context";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WebSocketStatusWidget from "@/components/WebSocketStatusWidget";
import ToastContainer from "@/components/ToastContainer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
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
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <WebSocketProvider>
              <GameProvider>
                <WebSocketStatusWidget />
                <Header />
                {/* Main content - flex-grow to fill available space */}
                <main className="flex-grow w-full flex flex-col">{children}</main>
                
                {/* Footer */}
                <Footer />

                {/* Toast notifications */}
                <ToastContainer />
              </GameProvider>
            </WebSocketProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}