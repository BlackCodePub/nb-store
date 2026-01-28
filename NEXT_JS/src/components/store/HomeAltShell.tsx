import StoreFooter from './StoreFooter';
import StoreHeaderServer from './StoreHeaderServer';

export default function HomeAltShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="home-alt-layout home-alt-fixed">
      <StoreHeaderServer fixed />
      <main className="home-alt-main">{children}</main>
      <StoreFooter />
    </div>
  );
}
