'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '../../i18n/config';

interface StoreThemeGuardProps {
  storeTheme: string;
  children: React.ReactNode;
}

export default function StoreThemeGuard({ storeTheme, children }: StoreThemeGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isAllowed = useMemo(() => {
    if (!pathname) return true;

    const normalizedTheme = String(storeTheme || '').trim().toLowerCase();

    let path = pathname;
    const localeMatch = locales.find((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`));
    if (localeMatch) {
      path = path.slice(localeMatch.length + 1) || '/';
    }

    if (normalizedTheme === 'development') {
      return (
        path === '/' ||
        path.startsWith('/login') ||
        path === '/admin' ||
        path.startsWith('/admin/')
      );
    }

    if (normalizedTheme === 'maintenance') {
      return (
        path === '/' ||
        path.startsWith('/login') ||
        path.startsWith('/register') ||
        path.startsWith('/account')
      );
    }

    return true;
  }, [pathname, storeTheme]);

  useEffect(() => {
    if (!isAllowed) {
      router.replace('/');
    }
  }, [isAllowed, router]);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
