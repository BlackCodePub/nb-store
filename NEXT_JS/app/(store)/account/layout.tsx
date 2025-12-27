'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const menuItems = [
  { href: '/account', label: 'Visão Geral', icon: 'bi-grid' },
  { href: '/account/orders', label: 'Meus Pedidos', icon: 'bi-bag' },
  { href: '/account/downloads', label: 'Meus Downloads', icon: 'bi-cloud-download' },
  { href: '/account/profile', label: 'Dados Pessoais', icon: 'bi-person' },
  { href: '/account/addresses', label: 'Endereços', icon: 'bi-geo-alt' },
  { href: '/account/security', label: 'Segurança', icon: 'bi-shield-lock' },
  { href: '/account/privacy', label: 'Privacidade', icon: 'bi-shield-check' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Redirecionar para login com o path atual como callbackUrl
      const currentPath = pathname || '/account';
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        {/* Sidebar */}
        <div className="col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              {/* User Info */}
              <div className="text-center mb-4">
                <div
                  className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: 80, height: 80, fontSize: '2rem' }}
                >
                  {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase()}
                </div>
                <h6 className="mb-1">{session.user?.name || 'Usuário'}</h6>
                <small className="text-muted">{session.user?.email}</small>
              </div>

              {/* Menu */}
              <nav className="nav flex-column">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link d-flex align-items-center gap-2 rounded px-3 py-2 ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-dark hover-bg-light'
                      }`}
                    >
                      <i className={`bi ${item.icon}`}></i>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <hr className="my-3" />

              {/* Logout */}
              <Link
                href="/api/auth/signout"
                className="nav-link d-flex align-items-center gap-2 text-danger px-3 py-2"
              >
                <i className="bi bi-box-arrow-right"></i>
                Sair da conta
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="col-lg-9">{children}</div>
      </div>
    </div>
  );
}
