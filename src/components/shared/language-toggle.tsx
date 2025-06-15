
"use client";

import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      size="sm"
      onClick={toggleLanguage}
      className="w-10 px-0 bg-sky-500 text-white hover:bg-sky-600"
      aria-label={language === 'es' ? "Switch to English" : "Cambiar a Español"}
    >
      {language.toUpperCase()}
    </Button>
  );
}

    