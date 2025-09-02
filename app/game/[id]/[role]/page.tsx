import { Suspense } from "react";
import { notFound } from "next/navigation";
import GameClient from "@/components/GameClient";
import type { PlayerRole } from "@/contexts/GameRoleContext";

interface GamePageProps {
  params: Promise<{
    id: string;
    role: string;
  }>;
}

// Validate role parameter
function isValidRole(role: string): role is PlayerRole {
  return role === "white" || role === "black" || role === "spectator";
}

export default async function GamePage({ params }: GamePageProps) {
  const { id: gameId, role } = await params;

  // Validate the role parameter
  if (!isValidRole(role)) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      }
    >
      <GameClient gameId={gameId} urlRole={role} />
    </Suspense>
  );
}
