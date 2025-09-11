import LocalGameView from "@/components/LocalGameView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline Practice | 2ban-2chess",
  description: "Practice ban chess offline - no server or account required",
};

export default function OfflinePlayPage() {
  return (
    <div className="flex-grow flex flex-col bg-gradient-to-br from-background via-background to-background-secondary overflow-hidden">
      <div className="flex-grow flex flex-col min-h-0">
        <div className="text-center py-4 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-2">Offline Practice</h1>
          <p className="text-foreground-muted">
            Learn ban chess offline - play both sides without any server connection
          </p>
        </div>
        
        <div className="flex-grow min-h-0 overflow-hidden">
          <LocalGameView />
        </div>
      </div>
    </div>
  );
}