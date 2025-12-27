import Link from 'next/link';
import StoreHeader from '../../src/components/store/StoreHeader';
import StoreFooter from '../../src/components/store/StoreFooter';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <StoreHeader />
      <main className="flex-fill">{children}</main>
      <StoreFooter />
    </div>
  );
}
