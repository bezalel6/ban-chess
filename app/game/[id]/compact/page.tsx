"use client";

import { use } from "react";
import GameViewer from "@/components/GameViewer";
import { GameProviderWrapper } from "@/components/GameProviderWrapper";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CompactGamePage({ params }: PageProps) {
  const { id } = use(params);
  
  return (
    <GameProviderWrapper gameId={id}>
      <GameViewer gameId={id} />
    </GameProviderWrapper>
  );
}