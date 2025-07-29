import React from 'react';
import { Terminal, Wifi, WifiOff, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConnectionDebugger({ 
  status, 
  logs,
  onRefresh 
}: {
  status: string;
  logs: string[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <h3 className="font-bold">Connection Debugger</h3>
          <div className="ml-2 flex items-center gap-1">
            {status === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm capitalize">{status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-8"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLogs}
            className="h-8"
          >
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 bg-black p-3 rounded max-h-60 overflow-y-auto">
          <pre className="text-xs font-mono">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="py-1 border-b border-gray-800">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-400">No connection logs yet</div>
            )}
          </pre>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-700 px-2 py-1 rounded-b text-xs"
      >
        {expanded ? 'Hide' : 'Show'} Details
      </button>
    </div>
  );
}