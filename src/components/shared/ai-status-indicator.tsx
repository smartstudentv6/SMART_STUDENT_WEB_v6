"use client";

import { useState, useEffect } from 'react';

export function AIStatusIndicator() {
  const [aiStatus, setAiStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        setAiStatus('checking');
        const response = await fetch('/api/ai-status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setAiStatus(data.isActive ? 'active' : 'inactive');
        setStatusMessage(data.reason || 'Unknown status');
        console.log('AI Status Check:', data);
      } catch (error) {
        console.error('Error checking AI status:', error);
        setAiStatus('inactive');
        setStatusMessage('Connection failed');
      }
    };
    
    // Check immediately
    checkAIStatus();
    
    // Check every 60 seconds (reduced frequency)
    const interval = setInterval(checkAIStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center ml-2">
      {aiStatus === 'checking' ? (
        <div 
          className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse shadow-lg" 
        />
      ) : aiStatus === 'active' ? (
        <div 
          className="h-3 w-3 rounded-full bg-green-500 shadow-lg ring-2 ring-green-200 animate-pulse" 
        />
      ) : (
        <div 
          className="h-3 w-3 rounded-full bg-red-500 shadow-lg" 
        />
      )}
    </div>
  );
}
