import { redirect } from "next/navigation";

// Redirect old offline route to new practice route
export default function OfflinePlayPage() {
  redirect("/play/practice");
}