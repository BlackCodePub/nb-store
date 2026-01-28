import type { Metadata } from 'next';
import './globals.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Providers } from './providers';
import { getServerLocale } from '../src/i18n/server';

export const metadata: Metadata = {
  title: 'nb-store',
  description: 'Loja e admin nb-store (Next.js) - MVP',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
