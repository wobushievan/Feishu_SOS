import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Chinese translations
import zhCommon from '@shared/locales/zh/common.json';
import zhEvent from '@shared/locales/zh/event.json';
import zhFeedback from '@shared/locales/zh/feedback.json';
import zhValidation from '@shared/locales/zh/validation.json';

// English translations
import enCommon from '@shared/locales/en/common.json';
import enEvent from '@shared/locales/en/event.json';
import enFeedback from '@shared/locales/en/feedback.json';
import enValidation from '@shared/locales/en/validation.json';

import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

const defaultResources = {
  zh: {
    common: zhCommon,
    event: zhEvent,
    feedback: zhFeedback,
    validation: zhValidation,
  },
  en: {
    common: enCommon,
    event: enEvent,
    feedback: enFeedback,
    validation: enValidation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: defaultResources,
    fallbackLng: 'en',
    defaultNS: 'common',
    detection: {
      order: ['navigator', 'cookie'],
      lookupCookie: 'lang',
      caches: ['cookie'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Load custom translations from backend
async function loadCustomTranslations() {
  try {
    const response = await axiosForBackend({
      url: '/api/translations',
      method: 'GET',
    });

    const translations = response.data;

    // Apply custom translations to i18n
    Object.entries(translations).forEach(([namespace, langData]) => {
      Object.entries(langData as Record<string, Record<string, unknown>>).forEach(([lang, data]) => {
        i18n.addResourceBundle(lang, namespace, data, true, true);
      });
    });
  } catch (error) {
    // Silent fail - use default translations
  }
}

// Export reload function for external use
export async function reloadCustomTranslations() {
  try {
    const response = await axiosForBackend({
      url: '/api/translations',
      method: 'GET',
    });

    const translations = response.data;

    // Clear and reload custom translations
    Object.entries(translations).forEach(([namespace, langData]) => {
      Object.entries(langData as Record<string, Record<string, unknown>>).forEach(([lang, data]) => {
        i18n.removeResourceBundle(lang, namespace);
        i18n.addResourceBundle(lang, namespace, data, true, true);
      });
    });
  } catch (error) {
    // Silent fail
  }
}

loadCustomTranslations();

export default i18n;
