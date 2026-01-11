import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadLanguage, saveLanguage } from '../i18n/config';

export type Language = 'tr' | 'en' | 'ar' | 'de';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>('tr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initLanguage = async () => {
      try {
        const savedLanguage = await loadLanguage();
        setCurrentLanguage(savedLanguage as Language);
        i18n.changeLanguage(savedLanguage);
      } catch (error) {
        console.error('Error initializing language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initLanguage();
  }, [i18n]);

  const changeLanguage = async (language: Language) => {
    try {
      await saveLanguage(language);
      setCurrentLanguage(language);
      i18n.changeLanguage(language);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return {
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
  };
};
