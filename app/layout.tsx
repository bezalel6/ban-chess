import "./globals.css";
import "@bezalel6/react-chessground/dist/react-chessground.css";
import type { Metadata } from "next";
import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { ToastProvider } from "@/lib/toast/toast-context";
import Header from "@/components/layout/Header";
import ConnectionStatusOverlay from "@/components/ConnectionStatusOverlay";
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
      <body className="bg-background text-foreground min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <WebSocketProvider>
              <UserRoleProvider>
                <ConnectionStatusOverlay />
                <WebSocketStatusWidget />
                <Header />

                {/* Main content */}
                <main className="w-full">
                  {children}
                </main>
                
                {/* Toast notifications */}
                <ToastContainer />
              </UserRoleProvider>
            </WebSocketProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
