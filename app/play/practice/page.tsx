import LocalGameView from "@/components/LocalGameView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice | Ban Chess",
  description: "Practice ban chess - play both sides locally",
};

export default function PracticePage() {
  return (
    <div className="flex-grow flex flex-col bg-gradient-to-br from-background via-background to-background-secondary overflow-hidden">
      <div className="flex-grow flex flex-col min-h-0">
        <div className="text-center py-4 flex-shrink-0">
          <h1 className="text-3xl font-bold mb-2">Practice Mode</h1>
          <p className="text-foreground-muted">
            Play both sides to learn ban chess strategies
          </p>
        </div>
        
        <div className="flex-grow min-h-0 overflow-hidden">
          <LocalGameView />
        </div>
      </div>
    </div>
  );
}