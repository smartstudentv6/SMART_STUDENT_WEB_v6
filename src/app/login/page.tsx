
"use client";

import LoginForm from '@/components/auth/login-form';
import Logo from '@/components/shared/logo';
import { useLanguage } from '@/contexts/language-context';
import LanguageToggle from '@/components/shared/language-toggle';
import ThemeToggle from '@/components/shared/theme-toggle';

export default function LoginPage() {
  const { translate } = useLanguage();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="absolute top-4 right-4 flex items-center space-x-4">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="text-center mb-8">
          <Logo className="w-12 h-12 mx-auto text-foreground" />
          <h1 className="text-3xl font-bold mt-4 text-foreground font-headline">SMART STUDENT</h1>
          <p className="text-muted-foreground">{translate('appSlogan')}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

    