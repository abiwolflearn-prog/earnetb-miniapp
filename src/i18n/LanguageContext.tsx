import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Language, LanguageOption } from './types';
import { languages, getTranslation } from './index';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, params?: Record<string, any>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  languages: LanguageOption[];
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'am',
  setLanguage: () => {},
  t: (keyPath) => keyPath,
  formatCurrency: (amount) => `${amount} Birr`,
  formatDate: (dateStr) => dateStr,
  languages,
});

const STORAGE_KEY = 'novatask_language';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined' && localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'am' || saved === 'om' || saved === 'en') {
        return saved as Language;
      }
    }
    // Default to Amharic ('am') for first-time users as specified
    return 'am';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem(STORAGE_KEY, newLang);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (keyPath: string, params?: Record<string, any>): string => {
    return getTranslation(language, keyPath, params);
  };

  const formatCurrency = (amount: number): string => {
    const formatted = amount.toLocaleString();
    if (language === 'am') {
      return `${formatted} ብር`;
    } else {
      return `${formatted} Birr`;
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const localeMap: Record<Language, string> = {
        am: 'am-ET',
        om: 'om-ET',
        en: 'en-US',
      };

      return date.toLocaleDateString(localeMap[language] || 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatCurrency,
        formatDate,
        languages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
