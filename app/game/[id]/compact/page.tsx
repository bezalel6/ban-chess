import CompactGameClient from "@/components/CompactGameClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompactGamePage({ params }: PageProps) {
  const { id } = await params;
  
  return <CompactGameClient gameId={id} />;
}