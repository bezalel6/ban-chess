"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Wifi, WifiOff, Database, X } from "lucide-react";

type ServiceStatus = {
  websocket: boolean;
  redis: boolean;
  database: boolean;
};

export default function ServerStatus() {
  const [status, setStatus] = useState<ServiceStatus>({
    websocket: true,
    redis: true,
    database: true,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const newStatus = {
        websocket: true, // Default to true
        redis: true,     // Default to true  
        database: true,  // Default to true
      };
      
      // Check WebSocket health endpoint separately
      const healthUrl = process.env.NEXT_PUBLIC_WS_HEALTH_URL;
      if (healthUrl && healthUrl !== "") {
        try {
          const wsHealthRes = await fetch(healthUrl);
          const wsHealth = await wsHealthRes.json();
          newStatus.websocket = wsHealth.status === "ok";
          newStatus.redis = wsHealth.redis === "connected";
        } catch {
          // Only WebSocket/Redis are down, not necessarily database
          newStatus.websocket = false;
          newStatus.redis = false;
        }
      }
      
      // Check API/Database health separately
      try {
        const apiHealthRes = await fetch("/api/health");
        const apiHealth = await apiHealthRes.json();
        newStatus.database = apiHealth.database === "connected";
      } catch {
        // Only database connection failed
        newStatus.database = false;
      }
      
      setStatus(newStatus);
      
      // Show banner if any service is actually down
      const hasIssues = !newStatus.websocket || !newStatus.redis || !newStatus.database;
      setIsVisible(hasIssues && !dismissed);
    };

    // Check immediately
    checkStatus();
    
    // Check every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    
    return () => clearInterval(interval);
  }, [dismissed]);

  if (!isVisible) return null;

  const issues: string[] = [];
  if (!status.websocket) issues.push("WebSocket");
  if (!status.redis) issues.push("Redis");
  if (!status.database) issues.push("Database");

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <div>
              <p className="font-semibold">Server Connection Issues</p>
              <p className="text-sm opacity-90">
                {issues.length > 0 
                  ? `The following services are unavailable: ${issues.join(", ")}` 
                  : "Some services may be experiencing issues"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Service indicators */}
            <div className="flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1">
                {status.websocket ? (
                  <Wifi className="h-4 w-4 text-green-300" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-300" />
                )}
                <span className="text-xs">WS</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Database className={`h-4 w-4 ${status.redis ? "text-green-300" : "text-red-300"}`} />
                <span className="text-xs">Redis</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Database className={`h-4 w-4 ${status.database ? "text-green-300" : "text-red-300"}`} />
                <span className="text-xs">DB</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                setDismissed(true);
                setIsVisible(false);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}