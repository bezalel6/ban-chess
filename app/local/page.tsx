import LocalGameView from "@/components/LocalGameView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local Ban Chess | 2ban-2chess",
  description: "Play ban chess locally against yourself - no server required",
};

export default function LocalGamePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-background-secondary">
      <div className="container mx-auto py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Local Ban Chess</h1>
          <p className="text-foreground-muted">
            Practice ban chess offline - play both sides and learn the strategies
          </p>
        </div>
        
        <LocalGameView />
      </div>
    </main>
  );
}