
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import esTranslations from '@/locales/es.json';
import enTranslations from '@/locales/en.json';

type Language = 'es' | 'en';

interface Translations {
  [key: string]: string | NestedTranslations;
}
interface NestedTranslations {
  [key: string]: string;
}

const translationsData: Record<Language, Translations> = {
  es: esTranslations,
  en: enTranslations,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (key: string, replacements?: Record<string, string>) => string;
  toggleLanguage: () => void;
  currentTranslations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedLang = localStorage.getItem('scholarai-lang') as Language | null;
    if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
      setLanguageState(storedLang);
      document.documentElement.lang = storedLang;
    }
    setMounted(true);
  }, []);
  
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('scholarai-lang', lang);
    document.documentElement.lang = lang;
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'es' ? 'en' : 'es');
  }, [language, setLanguage]);

  const translate = useCallback((key: string, replacements?: Record<string, string>): string => {
    if (!mounted) return key; // Return key if not mounted to avoid hydration issues with server-rendered incorrect lang
    
    const keys = key.split('.');
    let M_TEXT_VALUE = translationsData[language];
    for (const k of keys) {
      if (M_TEXT_VALUE && typeof M_TEXT_VALUE === 'object' && k in M_TEXT_VALUE) {
        M_TEXT_VALUE = M_TEXT_VALUE[k] as string | NestedTranslations;
      } else {
        // console.warn(`Translation key "${key}" not found for language "${language}".`);
        return key; // Return the key itself if not found
      }
    }
    
    let M_TEXT = typeof M_TEXT_VALUE === 'string' ? M_TEXT_VALUE : key;

    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        M_TEXT = M_TEXT.replace(`{{${placeholder}}}`, replacements[placeholder]);
      });
    }
    return M_TEXT;
  }, [language, mounted]);

  if (!mounted) {
    // Render children without context during SSR or before hydration, or a loader
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, toggleLanguage, currentTranslations: translationsData[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

    