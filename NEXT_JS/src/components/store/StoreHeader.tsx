'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LocaleSelector from '../ui/LocaleSelector';
import UserMenuDropdown from './UserMenuDropdown';
import ThemeToggleButton from '../ui/ThemeToggleButton';

interface StoreHeaderProps {
  fixed?: boolean;
  storeName?: string;
  showDigital?: boolean;
  showPhysical?: boolean;
}

export default function StoreHeader({
  fixed = false,
  storeName = 'NoBugs Store',
  showDigital = true,
  showPhysical = true,
}: StoreHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className={`bg-white border-bottom ${fixed ? 'fixed-top' : 'sticky-top'}`}>
      {/* Top bar - Idioma/Moeda */}
      <div className="bg-dark text-white py-1" style={{ fontSize: '0.8rem' }}>
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2 align-items-center">
            <i className="bi bi-truck"></i>
            <span>Frete grátis acima de R$ 200</span>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <LocaleSelector compact />
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container py-3">
        <div className="row align-items-center">
          {/* Logo */}
          <div className="col-auto">
            <Link href="/" className="text-decoration-none">
              <h1 className="h4 mb-0 fw-bold text-primary">
                <i className="bi bi-bug me-2"></i>
                {storeName}
              </h1>
            </Link>
          </div>

          {/* Busca - Desktop */}
          <div className="col d-none d-lg-block">
            <form onSubmit={handleSearch} className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-search"></i>
              </button>
            </form>
          </div>

          {/* Ações */}
          <div className="col-auto d-flex align-items-center gap-3">
            <ThemeToggleButton />
            {/* Busca - Mobile */}
            <button
              className="btn btn-link text-dark d-lg-none p-0"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <i className="bi bi-search" style={{ fontSize: '1.3rem' }}></i>
            </button>

            {/* Conta */}
            <UserMenuDropdown />

            {/* Carrinho */}
            <Link href="/cart" className="btn btn-link text-dark p-0 position-relative">
              <i className="bi bi-cart3" style={{ fontSize: '1.5rem' }}></i>
              {/* Badge do carrinho - implementar contagem real depois */}
            </Link>

            {/* Menu Mobile */}
            <button
              className="btn btn-link text-dark d-lg-none p-0"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} style={{ fontSize: '1.5rem' }}></i>
            </button>
          </div>
        </div>

        {/* Busca Mobile Expandida */}
        {searchOpen && (
          <div className="mt-3 d-lg-none">
            <form onSubmit={handleSearch} className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-search"></i>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className={`border-top ${menuOpen ? '' : 'd-none d-lg-block'}`}>
        <div className="container">
          <ul className="nav flex-column flex-lg-row">
            <li className="nav-item">
              <Link href="/" className="nav-link text-dark">
                <i className="bi bi-house me-1"></i>
                Início
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/products" className="nav-link text-dark">
                <i className="bi bi-grid me-1"></i>
                Produtos
              </Link>
            </li>
            {showDigital && (
              <li className="nav-item">
                <Link href="/products?type=digital" className="nav-link text-dark">
                  <i className="bi bi-cloud-download me-1"></i>
                  Produtos Digitais
                </Link>
              </li>
            )}
            {showPhysical && (
              <li className="nav-item">
                <Link href="/products?type=physical" className="nav-link text-dark">
                  <i className="bi bi-box-seam me-1"></i>
                  Produtos Físicos
                </Link>
              </li>
            )}
            <li className="nav-item">
              <Link href="/about" className="nav-link text-dark">
                <i className="bi bi-info-circle me-1"></i>
                Sobre
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
