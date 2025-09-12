"use client";

import { use } from "react";
import GameViewer from "@/components/GameViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CompactGamePage({ params }: PageProps) {
  const { id } = use(params);
  
  return <GameViewer gameId={id} />;
}