import type { NextRequest } from 'next/server';

export const locales = ['pt-BR', 'en-US'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt-BR';

export const currencies = ['BRL', 'USD'] as const;
export type Currency = (typeof currencies)[number];
export const defaultCurrency: Currency = 'BRL';

export const localeNames: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
};

export const currencyNames: Record<Currency, string> = {
  'BRL': 'Real Brasileiro (R$)',
  'USD': 'US Dollar ($)',
};

export const currencySymbols: Record<Currency, string> = {
  'BRL': 'R$',
  'USD': '$',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function isValidCurrency(currency: string): currency is Currency {
  return currencies.includes(currency as Currency);
}

export function getLocaleFromRequest(req: NextRequest): Locale {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value as Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale;

  const header = req.headers.get('accept-language');
  if (header) {
    const match = locales.find((loc) => header.includes(loc));
    if (match) return match;
  }

  return defaultLocale;
}

export function getCurrencyFromRequest(req: NextRequest): Currency {
  const cookieCurrency = req.cookies.get('NEXT_CURRENCY')?.value as Currency | undefined;
  if (cookieCurrency && currencies.includes(cookieCurrency)) return cookieCurrency;
  return defaultCurrency;
}

/**
 * Formata valores monetários
 */
export function formatCurrency(amount: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formata datas
 */
export function formatDate(date: Date | string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...options,
  }).format(d);
}

/**
 * Formata números
 */
export function formatNumber(num: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(num);
}

