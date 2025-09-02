'use client';

import { useState } from 'react';

interface TestResult {
  title?: string;
  data?: unknown;
  error?: string;
}

interface TestResults {
  step1?: TestResult;
  step2?: TestResult;
  step3?: TestResult;
  error?: string;
}

export default function TestCookiesPage() {
  const [results, setResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResults({});

    try {
      // Step 1: Set test cookie via API
      const step1 = await fetch('/api/test-cookies');
      const data1 = await step1.json();
      
      setResults(prev => ({
        ...prev,
        step1: {
          title: 'Step 1: Set test cookie on chess.rndev.site',
          data: data1
        }
      }));

      // Step 2: Test WebSocket server can read cookies
      const step2 = await fetch('/api/test-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testWebSocket: true })
      });
      const data2 = await step2.json();
      
      setResults(prev => ({
        ...prev,
        step2: {
          title: 'Step 2: Test WebSocket server receives cookies',
          data: data2
        }
      }));

      // Step 3: Direct call to WebSocket health endpoint (will fail in browser due to CORS but shows the attempt)
      try {
        const wsHealthUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.replace('wss://', 'https://').replace('ws://', 'http://') || 'http://localhost:3001';
        const step3 = await fetch(`${wsHealthUrl.replace(':3001', ':3002')}/health`, {
          credentials: 'include'
        });
        const data3 = await step3.json();
        
        setResults(prev => ({
          ...prev,
          step3: {
            title: 'Step 3: Direct WebSocket health check',
            data: data3
          }
        }));
      } catch {
        setResults(prev => ({
          ...prev,
          step3: {
            title: 'Step 3: Direct WebSocket health check',
            error: 'Expected to fail from browser due to ports/CORS. Use the API endpoint instead.'
          }
        }));
      }

    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Cookie Sharing Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Subdomain Cookie Sharing</h2>
          <p className="text-gray-400 mb-4">
            This test verifies that cookies set on chess.rndev.site can be read by ws-chess.rndev.site
          </p>
          
          <button
            onClick={runTest}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run Cookie Test'}
          </button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(results, null, 2)}
            </pre>
            
            {results.step2?.data?.webSocketHealthCheck && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-600 rounded">
                <h3 className="font-semibold text-green-400 mb-2">✓ Cookie Sharing Status</h3>
                {(() => {
                  try {
                    const wsData = JSON.parse(results.step2.data.webSocketHealthCheck);
                    return (
                      <ul className="text-sm space-y-1">
                        <li>Test cookie received: {wsData.cookies?.hasTestCookie ? '✓' : '✗'}</li>
                        <li>Session token shared: {wsData.cookies?.hasSessionToken ? '✓' : '✗'}</li>
                        <li>OAuth state shared: {wsData.cookies?.hasState ? '✓' : '✗'}</li>
                        <li>Total cookies received: {wsData.cookies?.received || 0}</li>
                      </ul>
                    );
                  } catch {
                    return <p className="text-sm">Could not parse WebSocket response</p>;
                  }
                })()}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>WebSocket URL: {process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'}</p>
        </div>
      </div>
    </div>
  );
}