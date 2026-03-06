import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  details?: Record<string, any>;
}

interface ScanLogViewerProps {
  logs: LogEntry[];
  isScanning: boolean;
}

const ScanLogViewer: React.FC<ScanLogViewerProps> = ({ logs, isScanning }) => {
  const endOfLogsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (endOfLogsRef.current) {
      endOfLogsRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const getLogTextColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-700 dark:text-red-400';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'info':
      default:
        return 'text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <Card className="w-full border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📋 Scan Logs
            {isScanning && (
              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-500 rounded-full animate-pulse">
                Live
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] border border-border/50 rounded-lg bg-background/50 p-4">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {isScanning ? 'Waiting for scan logs...' : 'No logs yet. Start a scan to see logs here.'}
              </div>
            ) : (
              <>
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 p-3 rounded-lg border ${getLogBgColor(log.level)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-start justify-between gap-2`}>
                        <p className={`text-sm font-medium ${getLogTextColor(log.level)}`}>
                          {log.message}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="flex gap-1">
                              <span className="font-medium">{key}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Invisible element at the end for auto-scroll */}
                <div ref={endOfLogsRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ScanLogViewer;
