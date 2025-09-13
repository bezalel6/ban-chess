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
  // Allow anonymous users - no authentication required
  // This follows our Lichess-style anonymous-first approach
  
  // Use Suspense to show loading state while data loads
  return (
    <Suspense fallback={<Loading />}>
      <SettingsContent />
    </Suspense>
  );
}
