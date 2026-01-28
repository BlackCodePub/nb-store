'use client';

import { SessionProvider } from 'next-auth/react';
import { I18nProvider } from '../src/i18n/I18nContext';
import { ThemeProvider } from '../src/components/ui/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
