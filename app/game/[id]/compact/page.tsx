import GameViewer from "@/components/GameViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompactGamePage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <GameViewer 
      gameId={id} 
      mode="compact"
      viewOptions={{
        showSidebar: false,
        showControls: true,
        showHistory: false,
        showStats: false,
        showDebug: false
      }}
    />
  );
}