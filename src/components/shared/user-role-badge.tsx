"use client";

import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { usePathname } from 'next/navigation';
import { Shield, Crown, GraduationCap } from 'lucide-react';

export function UserRoleBadge() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const pathname = usePathname();

  // Solo mostrar el badge en rutas del dashboard
  if (!user || !pathname.startsWith('/dashboard')) return null;

  const roleConfig = {
    admin: {
      labelKey: 'roleAdmin',
      variant: 'destructive' as const,
      icon: Crown,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-700'
    },
    teacher: {
      labelKey: 'roleTeacher',
      variant: 'default' as const,
      icon: Shield,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200 dark:border-blue-700'
    },
    student: {
      labelKey: 'roleStudent',
      variant: 'secondary' as const,
      icon: GraduationCap,
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-700'
    }
  };

  const config = roleConfig[user.role];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} text-xs font-medium px-2 py-1 hidden sm:flex items-center gap-1`}
    >
      <Icon className="w-3 h-3" />
      {translate(config.labelKey)}
    </Badge>
  );
}
