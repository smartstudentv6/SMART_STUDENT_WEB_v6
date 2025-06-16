
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
  // `mounted` is primarily to gate client-side only operations like localStorage access.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedLang = localStorage.getItem('smart-student-lang') as Language | null;
    if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
      setLanguageState(storedLang);
      document.documentElement.lang = storedLang;
    } else {
      // If no stored language, ensure the initial state ('es') is reflected.
      document.documentElement.lang = 'es';
    }
    setMounted(true);
  }, []); // Runs once on client mount
  
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart-student-lang', lang);
      document.documentElement.lang = lang;
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'es' ? 'en' : 'es');
  }, [language, setLanguage]);

  const translate = useCallback((key: string, replacements?: Record<string, string>): string => {
    // `language` state is 'es' on SSR/initial client render, then updates from localStorage via useEffect.
    // This ensures consistent rendering during hydration.
    const langToUse = language;
    
    const keys = key.split('.');
    let M_TEXT_VALUE = translationsData[langToUse];
    for (const k of keys) {
      if (M_TEXT_VALUE && typeof M_TEXT_VALUE === 'object' && k in M_TEXT_VALUE) {
        M_TEXT_VALUE = M_TEXT_VALUE[k] as string | NestedTranslations;
      } else {
        // console.warn(`Translation key "${key}" not found for language "${langToUse}".`);
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
  }, [language]);

  // The LanguageContext.Provider must always be rendered.
  // The `translate` function handles behavior based on the `language` state,
  // which correctly transitions from initial to client-side resolved state.
  return (
    <LanguageContext.Provider value={{ 
        language, 
        setLanguage, 
        translate, 
        toggleLanguage, 
        currentTranslations: translationsData[language] 
    }}>
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

    