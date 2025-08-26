import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { UsernameOverlay } from "@/components/UsernameOverlay";
import { UserInfo } from "@/components/UserInfo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ban Chess Web",
  description:
    "Online platform for playing Ban Chess - a chess variant where opponents can ban moves",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <UsernameOverlay />
          <UserInfo />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
