import { Language, LanguageOption, TranslationDictionary } from './types';
import { amTranslations } from './am';
import { omTranslations } from './om';
import { enTranslations } from './en';

export const translations: Record<Language, TranslationDictionary> = {
  am: amTranslations,
  om: omTranslations,
  en: enTranslations,
};

export const languages: LanguageOption[] = [
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', flag: '🇪🇹' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
];

/**
 * Helper to retrieve nested keys like 'home.active_balance'
 * with dynamic {{param}} string replacement.
 */
export function getTranslation(
  lang: Language,
  keyPath: string,
  params?: Record<string, any>
): string {
  const currentDict = translations[lang] || translations.am;
  const fallbackDict = translations.am;

  const keys = keyPath.split('.');
  let result: any = currentDict;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      result = undefined;
      break;
    }
  }

  // Fallback to Amharic if key missing in current language
  if (result === undefined && lang !== 'am') {
    let fbResult: any = fallbackDict;
    for (const k of keys) {
      if (fbResult && typeof fbResult === 'object' && k in fbResult) {
        fbResult = fbResult[k];
      } else {
        fbResult = undefined;
        break;
      }
    }
    result = fbResult;
  }

  if (result === undefined || typeof result !== 'string') {
    return keyPath; // return key path as fallback
  }

  // Interpolate dynamic parameters like {{points}} or {{amount}}
  if (params) {
    Object.keys(params).forEach((paramKey) => {
      const val = params[paramKey];
      const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
      result = (result as string).replace(regex, String(val !== undefined ? val : ''));
    });
  }

  return result;
}
