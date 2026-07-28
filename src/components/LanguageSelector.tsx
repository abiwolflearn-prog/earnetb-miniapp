import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Language } from '../i18n/types';
import { triggerHaptic } from '../lib/telegram';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'card' | 'dropdown' | 'pills';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'card',
  className = '',
}) => {
  const { language, setLanguage, languages, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (langCode: Language) => {
    triggerHaptic('selection');
    setLanguage(langCode);
    setIsOpen(false);
  };

  if (variant === 'dropdown') {
    const activeLang = languages.find((l) => l.code === language) || languages[0];

    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f0f15] hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-all shadow-sm"
          title={t('languages.select_language')}
        >
          <span className="text-sm leading-none">{activeLang.flag}</span>
          <span>{activeLang.nativeName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
            <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>{t('languages.select_language')}</span>
              </p>
            </div>
            <div className="space-y-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    language === lang.code
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {language === lang.code && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${className}`}>
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                  : 'bg-[#0f0f15] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-sm leading-none">{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'card' variant (Ideal for Profile / Settings page)
  return (
    <div className={`p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-3 shadow-xl ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{t('profile.language_setting')}</h4>
            <p className="text-xs text-slate-400">{t('profile.select_language')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-indigo-500/15 border-indigo-500/60 text-white ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">{lang.flag}</span>
                <div>
                  <p className="text-xs font-bold text-white">{lang.nativeName}</p>
                  <p className="text-[10px] text-slate-400">{lang.name}</p>
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
