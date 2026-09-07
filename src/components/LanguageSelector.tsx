import React from 'react';
import { Language } from '../types';
import { LANGUAGE_OPTIONS, useI18n } from '../i18n';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useI18n();

  return (
    <select
      aria-label={t('changeLanguage')}
      value={language}
      onChange={(event) => setLanguage(event.target.value as Language)}
      className="h-8 max-w-[100px] rounded-full bg-[#FFFFFF] px-2 text-[#172019] text-xs font-semibold border border-[#DCE5DE] shadow-xs"
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <option key={option.code} value={option.code}>{option.nativeLabel}</option>
      ))}
    </select>
  );
};
