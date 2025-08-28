import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import { getCurrentUser } from "@/lib/auth-unified";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import UserDisplay from "@/components/UserDisplay";

export const metadata: Metadata = {
  title: "2 Ban 2 Chess",
  description: "Chess with bans",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen">
        <AuthProvider userPromise={Promise.resolve(user)}>
          <WebSocketProvider>
            <UserDisplay />
            {/* Simple persistent header */}
            <header className="border-b border-border bg-background p-4">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                <Link href="/" className="text-xl font-bold">
                  ♟️ 2 Ban 2 Chess
                </Link>
              </div>
            </header>

            {/* Main content */}
            <main className="max-w-4xl mx-auto p-4">
              {children}
            </main>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}