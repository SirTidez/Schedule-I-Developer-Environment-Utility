import React, { useState, useEffect, useRef } from 'react';

interface TerminalOutputProps {
  logs: string[];
  isVisible: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs, isVisible }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isVisible) return null;

  return (
    <div className="bg-black rounded-lg p-4 font-mono text-sm border border-gray-600">
      <div className="flex items-center mb-2">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <span className="ml-3 text-gray-400">Terminal Output</span>
      </div>
      
      <div 
        ref={terminalRef}
        className="bg-gray-900 rounded p-3 h-64 overflow-y-auto text-green-400"
        style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">Waiting for file operations...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
              <span className="ml-2">{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TerminalOutput;
