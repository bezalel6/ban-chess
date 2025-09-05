import { useCallback, useState } from "react";
import type { Move, Ban } from "../types";
import soundManager from "@/lib/sound-manager";

export type BanDifficulty = "easy" | "medium" | "hard";

interface MoveHandlerParams {
  onMove: (move: Move) => void;
  onBan: (ban: Ban) => void;
  currentBan?: Ban;
  banDifficulty?: BanDifficulty;
}

interface MoveHandlerResult {
  handleMove: (move: Move) => void;
  handleBan: (ban: Ban) => void;
  showBannedAlert: boolean;
  dismissBannedAlert: () => void;
}

export function useMoveHandler({
  onMove,
  onBan,
  currentBan,
  banDifficulty = "medium",
}: MoveHandlerParams): MoveHandlerResult {
  const [showBannedAlert, setShowBannedAlert] = useState(false);

  const dismissBannedAlert = useCallback(() => {
    setShowBannedAlert(false);
  }, []);

  const handleMove = useCallback((move: Move) => {
    // Check if this move is banned
    if (currentBan && 
        currentBan.from === move.from && 
        currentBan.to === move.to) {
      
      // Show alert and play sound based on difficulty
      setShowBannedAlert(true);
      
      if (banDifficulty === 'hard') {
        soundManager.playEvent('ban-attempt-hard');
      } else if (banDifficulty === 'medium') {
        soundManager.playEvent('ban-attempt-medium');
      } else {
        soundManager.playEvent('ban-attempt-easy');
      }
      
      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        setShowBannedAlert(false);
      }, 2000);
      
      // Don't process the banned move
      return;
    }
    
    // Process valid move
    onMove(move);
  }, [onMove, currentBan, banDifficulty]);

  const handleBan = useCallback((ban: Ban) => {
    onBan(ban);
  }, [onBan]);

  return {
    handleMove,
    handleBan,
    showBannedAlert,
    dismissBannedAlert,
  };
}