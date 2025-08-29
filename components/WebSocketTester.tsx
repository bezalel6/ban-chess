'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle, XCircle, Wifi, WifiOff, Send, Trash2, Play, Square } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'sent' | 'received';
  message: string;
  data?: unknown;
}

interface ConnectionTest {
  url: string;
  label: string;
  status: 'pending' | 'testing' | 'success' | 'error';
  message?: string;
  latency?: number;
}

export default function WebSocketTester() {
  const [wsUrl, setWsUrl] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [useSecure, setUseSecure] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);

  // Determine default WebSocket URL based on environment
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // Set default based on environment
    if (host === 'localhost') {
      setWsUrl('ws://localhost:3001');
      setUseSecure(false);
    } else if (host.includes('chess.rndev.site')) {
      setWsUrl('wss://ws-chess.rndev.site');
      setUseSecure(true);
    } else {
      setWsUrl(`${protocol}//${host}:3001`);
      setUseSecure(protocol === 'wss:');
    }
  }, []);

  const addLog = useCallback((type: LogEntry['type'], message: string, data?: unknown) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      data
    };
    setLogs(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  const testDNS = async (domain: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch(`https://${domain}`, {
        mode: 'no-cors',
        signal: controller.signal
      }).catch(err => {
        if (err.name === 'AbortError') {
          throw new Error('DNS lookup timeout');
        }
        return { ok: false };
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  };

  const testWebSocketConnection = async (url: string, label: string): Promise<ConnectionTest> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const test: ConnectionTest = { url, label, status: 'testing' };
      
      try {
        const ws = new WebSocket(url);
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ ...test, status: 'error', message: 'Connection timeout (5s)' });
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          ws.send(JSON.stringify({ type: 'ping' }));
          setTimeout(() => ws.close(), 1000);
          resolve({ ...test, status: 'success', latency, message: `Connected in ${latency}ms` });
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ ...test, status: 'error', message: 'Connection failed' });
        };
        
      } catch (error) {
        resolve({ ...test, status: 'error', message: `Failed: ${error}` });
      }
    });
  };

  const runComprehensiveTests = async () => {
    setIsAutoTesting(true);
    testAbortRef.current = new AbortController();
    
    const tests: ConnectionTest[] = [
      { url: 'wss://ws-chess.rndev.site', label: 'Production WebSocket (WSS)', status: 'pending' },
      { url: 'wss://ws.chess.rndev.site', label: 'Legacy WebSocket (WSS)', status: 'pending' },
      { url: 'ws://localhost:3001', label: 'Local Development (WS)', status: 'pending' },
      { url: 'ws://ws-chess.rndev.site', label: 'Production Non-Secure (WS)', status: 'pending' }
    ];
    
    setConnectionTests(tests);
    addLog('info', 'Starting comprehensive connection tests...');
    
    // Test DNS first
    addLog('info', 'Testing DNS resolution...');
    const dnsResults = await Promise.all([
      testDNS('ws-chess.rndev.site'),
      testDNS('chess.rndev.site')
    ]);
    
    if (dnsResults[0]) {
      addLog('success', 'DNS resolved: ws-chess.rndev.site');
    } else {
      addLog('error', 'DNS failed: ws-chess.rndev.site');
    }
    
    if (dnsResults[1]) {
      addLog('success', 'DNS resolved: chess.rndev.site');
    } else {
      addLog('error', 'DNS failed: chess.rndev.site');
    }
    
    // Test each WebSocket connection
    for (let i = 0; i < tests.length; i++) {
      if (testAbortRef.current?.signal.aborted) break;
      
      setConnectionTests(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: 'testing' } : t
      ));
      
      const result = await testWebSocketConnection(tests[i].url, tests[i].label);
      
      setConnectionTests(prev => prev.map((t, idx) => 
        idx === i ? result : t
      ));
      
      if (result.status === 'success') {
        addLog('success', `${result.label}: ${result.message}`);
      } else {
        addLog('error', `${result.label}: ${result.message}`);
      }
    }
    
    addLog('info', 'All tests completed');
    setIsAutoTesting(false);
  };

  const stopTests = () => {
    testAbortRef.current?.abort();
    setIsAutoTesting(false);
    addLog('warning', 'Tests stopped by user');
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addLog('warning', 'Already connected');
      return;
    }
    
    try {
      addLog('info', `Connecting to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        addLog('success', 'WebSocket connected successfully');
        
        // Send test authentication
        const authMsg = {
          type: 'authenticate',
          userId: 'test-user-' + Date.now(),
          username: 'TestUser'
        };
        ws.send(JSON.stringify(authMsg));
        addLog('sent', 'Sent authentication', authMsg);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog('received', `Received: ${data.type}`, data);
        } catch {
          addLog('received', 'Received non-JSON message', event.data);
        }
      };
      
      ws.onerror = (error) => {
        addLog('error', 'WebSocket error occurred');
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        addLog('info', `WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
      };
      
      wsRef.current = ws;
    } catch (error) {
      addLog('error', `Failed to create WebSocket: ${error}`);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      addLog('info', 'Disconnected from WebSocket');
    }
  };

  const sendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('error', 'Not connected to WebSocket');
      return;
    }
    
    try {
      const message = JSON.parse(customMessage);
      wsRef.current.send(JSON.stringify(message));
      addLog('sent', `Sent custom message`, message);
      setCustomMessage('');
    } catch (error) {
      addLog('error', `Invalid JSON: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'border-green-500/20 bg-green-500/5';
      case 'error': return 'border-red-500/20 bg-red-500/5';
      case 'warning': return 'border-yellow-500/20 bg-yellow-500/5';
      case 'sent': return 'border-purple-500/20 bg-purple-500/5';
      case 'received': return 'border-cyan-500/20 bg-cyan-500/5';
      default: return 'border-blue-500/20 bg-blue-500/5';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h1 className="text-3xl font-bold mb-2">WebSocket Testing & Debugging</h1>
          <p className="text-gray-400">Test WebSocket connections and debug communication issues</p>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Connection Status</h2>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-500">Disconnected</span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Protocol Selection */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  setUseSecure(false);
                  const url = wsUrl.replace(/^wss:/, 'ws:');
                  setWsUrl(url);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !useSecure 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                WS (Non-Secure)
              </button>
              <button
                onClick={() => {
                  setUseSecure(true);
                  const url = wsUrl.replace(/^ws:/, 'wss:');
                  setWsUrl(url);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  useSecure 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                WSS (Secure)
              </button>
              <span className="flex items-center px-3 text-sm text-gray-400">
                {useSecure ? '🔒 Using secure WebSocket' : '⚠️ Using non-secure WebSocket'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => {
                  setWsUrl(e.target.value);
                  // Auto-detect protocol from URL
                  setUseSecure(e.target.value.startsWith('wss:'));
                }}
                placeholder="WebSocket URL (e.g., ws://localhost:3001 or wss://ws-chess.rndev.site)"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {!isConnected ? (
                <button
                  onClick={connect}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Automated Tests */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Automated Connection Tests</h2>
            {!isAutoTesting ? (
              <button
                onClick={runComprehensiveTests}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Run All Tests
              </button>
            ) : (
              <button
                onClick={stopTests}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Tests
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {connectionTests.map((test, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                test.status === 'success' ? 'border-green-500/20 bg-green-500/5' :
                test.status === 'error' ? 'border-red-500/20 bg-red-500/5' :
                test.status === 'testing' ? 'border-yellow-500/20 bg-yellow-500/5' :
                'border-gray-700 bg-gray-800/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{test.label}</div>
                    <div className="text-sm text-gray-400">{test.url}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {test.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                    {test.status === 'testing' && (
                      <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {test.message && <span className="text-sm">{test.message}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Send Custom Message */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Send Custom Message</h2>
          <div className="flex gap-2">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder='{"type": "ping"}'
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm h-20 resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!isConnected}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Logs</h2>
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No logs yet</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`p-3 rounded-lg border ${getLogColor(log.type)}`}>
                  <div className="flex items-start gap-2">
                    {getLogIcon(log.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-800 rounded uppercase">
                          {log.type}
                        </span>
                      </div>
                      <div className="mt-1">{log.message}</div>
                      {log.data && (
                        <pre className="mt-2 p-2 bg-gray-800/50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}