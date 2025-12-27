'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, Currency, defaultLocale, defaultCurrency, locales, currencies } from './config';
import { getTranslations, type Translations } from './index';

interface I18nContextType {
  locale: Locale;
  currency: Currency;
  t: Translations;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency);
  const [t, setT] = useState<Translations>(getTranslations(defaultLocale));
  
  // Carregar preferências do cookie/localStorage no mount
  useEffect(() => {
    const savedLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale;
    
    const savedCurrency = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_CURRENCY='))
      ?.split('=')[1] as Currency;
    
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale);
      setT(getTranslations(savedLocale));
    }
    
    if (savedCurrency && currencies.includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
    }
  }, []);
  
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setT(getTranslations(newLocale));
    // Salvar no cookie (1 ano)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Também salvar via API se logado
    fetch('/api/account/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {});
  };
  
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    document.cookie = `NEXT_CURRENCY=${newCurrency}; path=/; max-age=${60 * 60 * 24 * 365}`;
    fetch('/api/account/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: newCurrency }),
    }).catch(() => {});
  };
  
  return (
    <I18nContext.Provider value={{ locale, currency, t, setLocale, setCurrency }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function useTranslations() {
  return useI18n().t;
}

export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}

export function useCurrency() {
  const { currency, setCurrency } = useI18n();
  return { currency, setCurrency };
}
