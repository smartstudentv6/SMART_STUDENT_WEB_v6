"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';

export function AIStatusIndicator() {
  const [aiStatus, setAiStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
  const { translate } = useLanguage();

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const response = await fetch('/api/ai-status');
        const data = await response.json();
        setAiStatus(data.isActive ? 'active' : 'inactive');
      } catch (error) {
        console.error('Error checking AI status:', error);
        setAiStatus('inactive');
      }
    };
    
    checkAIStatus();
  }, []);

  return (
    <div className="ml-2">
      {aiStatus === 'checking' ? (
        <div 
          className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" 
          title={translate('aiStatusChecking')}
        />
      ) : aiStatus === 'active' ? (
        <div 
          className="h-2 w-2 rounded-full bg-green-500 animate-pulse" 
          title={translate('aiStatusActive')}
        />
      ) : (
        <div 
          className="h-2 w-2 rounded-full bg-red-500" 
          title={translate('aiStatusInactive')}
        />
      )}
    </div>
  );
}
