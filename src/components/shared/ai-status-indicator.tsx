"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';

export function AIStatusIndicator() {
  const [aiStatus, setAiStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { translate } = useLanguage();

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        setAiStatus('checking');
        const response = await fetch('/api/ai-status');
        const data = await response.json();
        setAiStatus(data.isActive ? 'active' : 'inactive');
        setStatusMessage(data.reason || 'Unknown status');
        console.log('AI Status Check:', data);
      } catch (error) {
        console.error('Error checking AI status:', error);
        setAiStatus('inactive');
        setStatusMessage('Failed to check status');
      }
    };
    
    // Check immediately
    checkAIStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkAIStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ml-2">
      {aiStatus === 'checking' ? (
        <div 
          className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" 
          title={`${translate('aiStatusChecking')} - ${statusMessage}`}
        />
      ) : aiStatus === 'active' ? (
        <div 
          className="h-2 w-2 rounded-full bg-green-500 animate-pulse" 
          title={`${translate('aiStatusActive')} - ${statusMessage}`}
        />
      ) : (
        <div 
          className="h-2 w-2 rounded-full bg-red-500" 
          title={`${translate('aiStatusInactive')} - ${statusMessage}`}
        />
      )}
    </div>
  );
}
