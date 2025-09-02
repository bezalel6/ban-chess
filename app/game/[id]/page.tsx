"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const GameClient = dynamic(() => import("@/components/GameClient"), {
  ssr: false,
});

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GamePage({ params }: GamePageProps) {
  const { id: gameId } = use(params);

  return <GameClient gameId={gameId} />;
}