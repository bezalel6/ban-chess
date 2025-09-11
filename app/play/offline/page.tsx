import LocalGameView from "@/components/LocalGameView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline Practice | 2ban-2chess",
  description: "Practice ban chess offline - no server or account required",
};

export default function OfflinePlayPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background-secondary">
      <div className="container mx-auto py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Offline Practice</h1>
          <p className="text-foreground-muted">
            Learn ban chess offline - play both sides without any server connection
          </p>
        </div>
        
        <LocalGameView />
      </div>
    </main>
  );
}