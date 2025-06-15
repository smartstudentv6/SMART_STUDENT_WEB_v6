
"use client";

import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="w-10 px-0"
      aria-label={language === 'es' ? "Switch to English" : "Cambiar a Español"}
    >
      {language.toUpperCase()}
    </Button>
  );
}

    