import { useMemo } from "react";
import type { BoardConfig, Orientation } from "../types";

interface ConfigParams {
  orientation: Orientation;
  coordinates?: boolean;
  animationDuration?: number;
  showLastMove?: boolean;
  showCheck?: boolean;
}

const DEFAULT_CONFIG: BoardConfig = {
  orientation: "white",
  coordinates: false,
  animation: {
    enabled: true,
    duration: 200,
  },
  highlight: {
    lastMove: true,
    check: true,
  },
};

export function useBoardConfig(params: ConfigParams): BoardConfig {
  return useMemo(() => ({
    orientation: params.orientation,
    coordinates: params.coordinates ?? DEFAULT_CONFIG.coordinates,
    animation: {
      enabled: true,
      duration: params.animationDuration ?? DEFAULT_CONFIG.animation!.duration,
    },
    highlight: {
      lastMove: params.showLastMove ?? DEFAULT_CONFIG.highlight!.lastMove,
      check: params.showCheck ?? DEFAULT_CONFIG.highlight!.check,
    },
  }), [
    params.orientation,
    params.coordinates,
    params.animationDuration,
    params.showLastMove,
    params.showCheck,
  ]);
}