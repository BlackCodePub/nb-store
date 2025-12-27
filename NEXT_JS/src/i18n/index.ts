/**
 * i18n Index - Export all translations and utilities
 */

export * from './config';
export { ptBR, type Translations } from './locales/pt-BR';
export { enUS } from './locales/en-US';

import { ptBR } from './locales/pt-BR';
import { enUS } from './locales/en-US';
import type { Translations } from './locales/pt-BR';
import type { Locale } from './config';

export const translations: Record<Locale, Translations> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || ptBR;
}

/**
 * Helper para acessar traduções aninhadas
 * Exemplo: t('auth.login') -> 'Entrar'
 */
export function createT(locale: Locale) {
  const t = getTranslations(locale);
  
  return function translate(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: unknown = t;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`[i18n] Missing translation: ${key}`);
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`[i18n] Translation is not a string: ${key}`);
      return key;
    }
    
    // Substituir parâmetros {{param}}
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || `{{${paramKey}}}`;
      });
    }
    
    return value;
  };
}
