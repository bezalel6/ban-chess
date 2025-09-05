"use client";

import React, { memo, useEffect, useState } from "react";
import type { AlertOverlayProps } from "../types";

const AlertOverlay = memo(function AlertOverlay({ 
  visible, 
  message, 
  severity, 
  duration = 2000,
  onDismiss 
}: AlertOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!show) return null;

  const severityStyles = {
    error: {
      bg: "bg-red-600/95",
      border: "border-red-400",
      animation: "animate-shake-alert",
    },
    warning: {
      bg: "bg-orange-500/90",
      border: "border-orange-300",
      animation: "animate-pulse",
    },
    info: {
      bg: "bg-gray-800/80",
      border: "border-gray-600",
      animation: "animate-fade-in",
    },
  };

  const styles = severityStyles[severity];

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className={`${styles.bg} text-white px-6 py-3 rounded-lg shadow-xl ${styles.animation} border ${styles.border}`}>
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );
});

export default AlertOverlay;