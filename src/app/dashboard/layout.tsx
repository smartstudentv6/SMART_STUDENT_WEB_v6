
"use client";
import type React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/shared/logo';
import LanguageToggle from '@/components/shared/language-toggle';
import ThemeToggle from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Library, FileText, Network, FileQuestion, ClipboardList, UserCircle2, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { Skeleton } from '@/components/ui/skeleton';

const navItems = [
  { href: '/dashboard', labelKey: 'navHome', icon: Home },
  { href: '/dashboard/libros', labelKey: 'navBooks', icon: Library },
  { href: '/dashboard/resumen', labelKey: 'navSummary', icon: FileText },
  { href: '/dashboard/mapa-mental', labelKey: 'navMindMap', icon: Network },
  { href: '/dashboard/cuestionario', labelKey: 'navQuiz', icon: FileQuestion },
  { href: '/dashboard/evaluacion', labelKey: 'navEvaluation', icon: ClipboardList },
  { href: '/dashboard/perfil', labelKey: 'navProfile', icon: UserCircle2 },
  { href: '/dashboard/ayuda', labelKey: 'navHelp', icon: HelpCircle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { translate } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-card border-b border-border">
          <nav className="container mx-auto px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-x-4 sm:gap-x-6">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-6 w-32 hidden sm:block" />
            </div>
            <div className="hidden md:flex items-center justify-center space-x-2 lg:space-x-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-20" />)}
            </div>
            <div className="flex justify-end items-center space-x-2 sm:space-x-4">
              <Skeleton className="w-10 h-9" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
          </nav>
        </header>
        <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-12 w-1/2 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 sm:gap-x-6">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Logo className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold whitespace-nowrap text-foreground hidden sm:block font-headline">
              SMART STUDENT
            </h1>
          </Link>
          
          <div className="hidden md:flex items-center justify-center space-x-1 lg:space-x-2 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap
                    ${isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  {translate(item.labelKey)}
                </Link>
              );
            })}
          </div>

          <div className="flex justify-end items-center space-x-2 sm:space-x-4">
            <LanguageToggle />
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout} 
              title={translate('logoutButtonTitle')}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={translate('logoutButtonTitle')}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </nav>
         {/* Mobile Navigation - Appears below header on small screens */}
        <div className="md:hidden bg-card border-t border-border p-2">
            <div className="flex items-center justify-start space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors min-w-[60px] text-center
                    ${isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="whitespace-nowrap">{translate(item.labelKey)}</span>
                </Link>
              );
            })}
            </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

    