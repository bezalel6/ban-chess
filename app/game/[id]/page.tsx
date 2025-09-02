import { redirect } from "next/navigation";

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { id: gameId } = await params;

  // Redirect to spectator view by default
  // In the future, we could check if the user is a player and redirect to their color
  redirect(`/game/${gameId}/spectator`);
}
