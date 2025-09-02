"use client";

import { useToast } from "@/lib/toast/toast-context";
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function Toast({ 
  toast, 
  onRemove 
}: { 
  toast: { id: string; message: string; type: string; duration?: number };
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300); // Wait for animation
  };

  // Get icon and colors based on type
  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          textColor: "text-green-500",
        };
      case "error":
        return {
          icon: <XCircle className="w-5 h-5" />,
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          textColor: "text-red-500",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          textColor: "text-yellow-500",
        };
      default:
        return {
          icon: <Info className="w-5 h-5" />,
          bgColor: "bg-lichess-orange-500/10",
          borderColor: "border-lichess-orange-500/30",
          textColor: "text-lichess-orange-500",
        };
    }
  };

  const { icon, bgColor, borderColor, textColor } = getToastStyles();

  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3 
        min-w-[300px] max-w-[500px]
        px-4 py-3 
        ${bgColor} 
        backdrop-blur-sm
        border ${borderColor}
        rounded-xl 
        shadow-lg
        transition-all duration-300 ease-out
        ${isExiting 
          ? "translate-x-full opacity-0" 
          : "translate-x-0 opacity-100 animate-slide-in"
        }
      `}
    >
      <div className={textColor}>{icon}</div>
      
      <p className="flex-1 text-sm text-foreground">
        {toast.message}
      </p>
      
      <button
        onClick={handleRemove}
        className="p-1 hover:bg-background/50 rounded-lg transition-colors pointer-events-auto"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}