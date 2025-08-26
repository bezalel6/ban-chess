import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { getCurrentUser } from "@/lib/auth-unified";
import UserInfoWrapper from "@/components/UserInfoWrapper";
import ReactScanProvider from "@/components/ReactScanProvider";

export const metadata: Metadata = {
  title: "2Ban 2Chess - Multiplayer Ban Chess",
  description:
    "Online platform for playing Ban Chess - a chess variant where opponents can ban moves",
};

import React from 'react';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data on the server - no await, let it stream
  const userPromise = getCurrentUser();

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <ReactScanProvider />
        <AuthProvider userPromise={userPromise}>
          <Suspense fallback={null}>
            <UserInfoWrapper />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
