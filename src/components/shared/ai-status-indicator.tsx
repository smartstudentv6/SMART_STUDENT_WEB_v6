"use client";

import { useState, useEffect } from 'react';

export function AIStatusIndicator() {
  const [aiStatus, setAiStatus] = useState<'checking' | 'active' | 'inactive'>('checking');

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
          title="Verificando conexión IA..."
        />
      ) : aiStatus === 'active' ? (
        <div 
          className="h-2 w-2 rounded-full bg-green-500 animate-pulse" 
          title="IA Activada - Generación con Gemini AI"
        />
      ) : (
        <div 
          className="h-2 w-2 rounded-full bg-red-500" 
          title="IA No Disponible - Modo de Ejemplo"
        />
      )}
    </div>
  );
}
