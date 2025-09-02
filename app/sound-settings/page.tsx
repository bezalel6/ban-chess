import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AuthSession } from "@/types/auth";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions) as AuthSession | null;
  
  // Redirect if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }
  
  // Render the client component (no longer needs session)
  return <SettingsClient />;
}