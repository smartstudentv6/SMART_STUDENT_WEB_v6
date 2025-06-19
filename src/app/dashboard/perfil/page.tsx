"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import to avoid SSR issues
const PerfilClientComponent = dynamic(() => import('./perfil-client'), {
  ssr: false,
  loading: () => (
    <div className="space-y-8">
      <div className="animate-pulse">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full mt-4" />
        <Skeleton className="h-32 w-full mt-4" />
      </div>
    </div>
  )
});

export default function PerfilPage() {
  return <PerfilClientComponent />;
}
