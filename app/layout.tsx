import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import Header from "@/components/layout/Header";
import ConnectionStatusOverlay from "@/components/ConnectionStatusOverlay";

export const metadata: Metadata = {
  title: "2 Ban 2 Chess",
  description: "Chess with bans",
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