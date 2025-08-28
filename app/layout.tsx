import "./globals.css";
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { getCurrentUser } from "@/lib/auth-unified";
import UserInfoWrapper from "@/components/UserInfoWrapper";
import ReactScanProvider from "@/components/ReactScanProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Ban Chess - Strategic Chess Variant",
  description:
    "Play Ban Chess online - A strategic chess variant where you can ban your opponent's moves",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data on the server - no await, let it stream
  const userPromise = getCurrentUser();

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        <ReactScanProvider />
        <AuthProvider userPromise={userPromise}>
          <Suspense fallback={null}>
            <UserInfoWrapper />
          </Suspense>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
