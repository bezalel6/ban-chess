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
      try {
        // Check WebSocket health endpoint
        const wsHealthRes = await fetch("http://localhost:3002/health");
        const wsHealth = await wsHealthRes.json();
        
        // Check main API health (which includes database)
        const apiHealthRes = await fetch("/api/health");
        const apiHealth = await apiHealthRes.json();
        
        setStatus({
          websocket: wsHealth.status === "ok",
          redis: wsHealth.redis === "connected",
          database: apiHealth.database === "connected",
        });
        
        // Show banner if any service is down
        const hasIssues = !wsHealth.redis || wsHealth.redis !== "connected" || 
                         !apiHealth.database || apiHealth.database !== "connected";
        setIsVisible(hasIssues && !dismissed);
        
      } catch {
        // If health check fails, assume services are down
        setStatus({
          websocket: false,
          redis: false,
          database: false,
        });
        setIsVisible(!dismissed);
      }
    };

    // Check immediately
    checkStatus();
    
    // Check every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    
    return () => clearInterval(interval);
  }, [dismissed]);

  if (!isVisible) return null;

  const issues = [];
  if (!status.websocket) issues.push("WebSocket");
  if (!status.redis) issues.push("Redis");
  if (!status.database) issues.push("Database");

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
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