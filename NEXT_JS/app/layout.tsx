import type { Metadata } from 'next';
import './globals.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'nb-store',
  description: 'Loja e admin nb-store (Next.js) - MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
