import Link from 'next/link';
import { prisma } from '../../src/server/db/client';
import StoreHeaderServer from '../../src/components/store/StoreHeaderServer';
import StoreFooter from '../../src/components/store/StoreFooter';
import StoreThemeGuard from '../../src/components/store/StoreThemeGuard';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let storeTheme = 'default';

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'storeTheme' } });
    if (setting?.value) {
      try {
        storeTheme = JSON.parse(setting.value);
      } catch {
        storeTheme = setting.value;
      }
    }
  } catch {
    storeTheme = 'default';
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <StoreHeaderServer />
      <StoreThemeGuard storeTheme={storeTheme}>
        <main className="flex-fill">{children}</main>
      </StoreThemeGuard>
      <StoreFooter />
    </div>
  );
}
