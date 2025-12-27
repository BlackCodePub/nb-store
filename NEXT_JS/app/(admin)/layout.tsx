'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'bi-speedometer2' },
  { 
    href: '/admin/catalog', 
    label: 'Catálogo', 
    icon: 'bi-box-seam',
    children: [
      { href: '/admin/catalog', label: 'Produtos', icon: 'bi-tag' },
      { href: '/admin/catalog/categories', label: 'Categorias', icon: 'bi-folder' },
    ]
  },
  { href: '/admin/orders', label: 'Pedidos', icon: 'bi-receipt' },
  { href: '/admin/users', label: 'Usuários', icon: 'bi-people' },
  { href: '/admin/coupons', label: 'Cupons', icon: 'bi-ticket-perforated' },
  { 
    href: '/admin/marketing', 
    label: 'Marketing', 
    icon: 'bi-megaphone',
    children: [
      { href: '/admin/marketing/banners', label: 'Banners', icon: 'bi-images' },
      { href: '/admin/marketing/newsletter', label: 'Newsletter', icon: 'bi-envelope' },
    ]
  },
  { 
    href: '/admin/content', 
    label: 'Conteúdo', 
    icon: 'bi-file-earmark-text',
    children: [
      { href: '/admin/content/posts', label: 'Posts', icon: 'bi-file-text' },
      { href: '/admin/content/comments', label: 'Comentários', icon: 'bi-chat-dots' },
    ]
  },
  { href: '/admin/digital', label: 'Ativos Digitais', icon: 'bi-cloud-download' },
  { href: '/admin/discord', label: 'Discord Gating', icon: 'bi-discord' },
  { 
    href: '/admin/system', 
    label: 'Sistema', 
    icon: 'bi-gear',
    children: [
      { href: '/admin/settings', label: 'Configurações', icon: 'bi-sliders' },
      { href: '/admin/roles', label: 'Roles/Permissões', icon: 'bi-shield-lock' },
    ]
  },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside 
      className={`bg-dark text-white d-flex flex-column transition-all ${collapsed ? 'sidebar-collapsed' : ''}`}
      style={{ 
        width: collapsed ? 70 : 260, 
        minHeight: '100vh',
        transition: 'width 0.2s ease'
      }}
    >
      {/* Header */}
      <div className="p-3 border-bottom border-secondary d-flex align-items-center justify-content-between">
        {!collapsed && <span className="fw-bold">nb-store Admin</span>}
        <button 
          className="btn btn-sm btn-outline-light border-0"
          onClick={onToggle}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-grow-1 py-2">
        {navItems.map((item) => (
          <div key={item.href}>
            {item.children ? (
              <>
                <button
                  className={`w-100 border-0 bg-transparent text-start px-3 py-2 d-flex align-items-center text-white-50 hover-bg-secondary ${isActive(item.href) ? 'bg-secondary bg-opacity-25 text-white' : ''}`}
                  onClick={() => toggleExpand(item.href)}
                  style={{ cursor: 'pointer' }}
                >
                  <i className={`bi ${item.icon} ${collapsed ? '' : 'me-3'}`} style={{ fontSize: '1.1rem' }}></i>
                  {!collapsed && (
                    <>
                      <span className="flex-grow-1">{item.label}</span>
                      <i className={`bi ${expandedItems.includes(item.href) ? 'bi-chevron-down' : 'bi-chevron-right'} small`}></i>
                    </>
                  )}
                </button>
                {!collapsed && expandedItems.includes(item.href) && (
                  <div className="ps-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`d-block px-3 py-2 text-decoration-none small ${isActive(child.href) && pathname === child.href ? 'text-white bg-primary bg-opacity-50 rounded' : 'text-white-50'}`}
                      >
                        <i className={`bi ${child.icon} me-2`}></i>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`d-block px-3 py-2 text-decoration-none d-flex align-items-center ${isActive(item.href) ? 'bg-primary text-white' : 'text-white-50'}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={`bi ${item.icon} ${collapsed ? '' : 'me-3'}`} style={{ fontSize: '1.1rem' }}></i>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-top border-secondary p-3">
        <Link
          href="/"
          className="d-flex align-items-center text-decoration-none text-white-50"
          title="Voltar à loja"
        >
          <i className={`bi bi-shop ${collapsed ? '' : 'me-3'}`}></i>
          {!collapsed && <span className="small">Voltar à loja</span>}
        </Link>
      </div>
    </aside>
  );
}

function AdminHeader({ userName }: { userName?: string }) {
  const pathname = usePathname();
  
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((part, index) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1),
      href: '/' + parts.slice(0, index + 1).join('/'),
      isLast: index === parts.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-0 small">
          {breadcrumbs.map((crumb, index) => (
            <li 
              key={crumb.href} 
              className={`breadcrumb-item ${crumb.isLast ? 'active' : ''}`}
              aria-current={crumb.isLast ? 'page' : undefined}
            >
              {crumb.isLast ? (
                crumb.label
              ) : (
                <Link href={crumb.href} className="text-decoration-none">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="d-flex align-items-center gap-3">
        <span className="text-muted small">{userName || 'Admin'}</span>
        <div className="dropdown">
          <button 
            className="btn btn-sm btn-outline-secondary dropdown-toggle" 
            type="button" 
            data-bs-toggle="dropdown"
          >
            <i className="bi bi-person-circle"></i>
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><Link className="dropdown-item" href="/account/profile">Meu perfil</Link></li>
            <li><hr className="dropdown-divider" /></li>
            <li><Link className="dropdown-item text-danger" href="/api/auth/signout">Sair</Link></li>
          </ul>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Recuperar preferência salva
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved) setCollapsed(saved === 'true');
  }, []);

  const toggleSidebar = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem('admin-sidebar-collapsed', String(newValue));
  };

  if (!mounted) {
    return (
      <div className="d-flex min-vh-100">
        <div style={{ width: 260 }} className="bg-dark"></div>
        <div className="flex-grow-1">
          <div className="bg-white border-bottom p-3" style={{ height: 60 }}></div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex min-vh-100">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex-grow-1 d-flex flex-column bg-light">
        <AdminHeader />
        <main className="flex-grow-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
      <style jsx global>{`
        .hover-bg-secondary:hover {
          background-color: rgba(108, 117, 125, 0.2) !important;
        }
      `}</style>
    </div>
  );
}
