import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AuthSession } from "@/types/auth";
import { Suspense } from "react";
import SettingsClient from "./SettingsClient";
import Loading from "./loading";
import { loadSoundLibrary } from "@/lib/sound-library-loader";
import { isAdmin } from "@/lib/admin";

// Separate async component for data loading
async function SettingsContent() {
  // Load sound library server-side to prevent hydration issues
  const soundLibrary = await loadSoundLibrary();

  // Check if user is admin
  const userIsAdmin = await isAdmin();

  // Pass the pre-loaded data to client component
  return (
    <SettingsClient initialSoundLibrary={soundLibrary} isAdmin={userIsAdmin} />
  );
}

export default async function SettingsPage() {
  const session = (await getServerSession(authOptions)) as AuthSession | null;

  // Redirect if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  // Use Suspense to show loading state while data loads
  return (
    <Suspense fallback={<Loading />}>
      <SettingsContent />
    </Suspense>
  );
}
