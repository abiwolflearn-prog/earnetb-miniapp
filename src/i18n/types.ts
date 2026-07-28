export type Language = 'am' | 'om' | 'en';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export type TranslationDictionary = Record<string, any>;
