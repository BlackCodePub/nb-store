import { cookies } from 'next/headers';
import { defaultCurrency, defaultLocale, isValidCurrency, isValidLocale } from './config';

export async function getServerLocale() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;
  return defaultLocale;
}

export async function getServerCurrency() {
  const cookieStore = await cookies();
  const cookieCurrency = cookieStore.get('NEXT_CURRENCY')?.value;
  if (cookieCurrency && isValidCurrency(cookieCurrency)) return cookieCurrency;
  return defaultCurrency;
}
