import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function ConnectionStatus({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 bg-background/90 backdrop-blur p-2 rounded-lg border">
      {status === 'connected' && (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-sm">Connected</span>
        </>
      )}
      {status === 'disconnected' && (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-sm">Disconnected</span>
        </>
      )}
      {status === 'connecting' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
          <span className="text-sm">Connecting...</span>
        </>
      )}
    </div>
  );
}