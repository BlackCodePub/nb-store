'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function StoreHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [locale, setLocale] = useState('pt-BR');
  const [currency, setCurrency] = useState('BRL');
  const [menuOpen, setMenuOpen] = useState(false);

  // Carregar preferências do localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') || 'pt-BR';
    const savedCurrency = localStorage.getItem('currency') || 'BRL';
    setLocale(savedLocale);
    setCurrency(savedCurrency);
  }, []);

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    // Aqui poderia implementar troca de idioma real com i18n
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
    // Aqui poderia disparar evento para recalcular preços
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white border-bottom sticky-top">
      {/* Top bar - Idioma/Moeda */}
      <div className="bg-dark text-white py-1" style={{ fontSize: '0.8rem' }}>
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2 align-items-center">
            <i className="bi bi-truck"></i>
            <span>Frete grátis acima de R$ 200</span>
          </div>
          <div className="d-flex gap-3 align-items-center">
            {/* Seletor de Idioma */}
            <div className="dropdown">
              <button
                className="btn btn-link text-white text-decoration-none p-0 dropdown-toggle"
                style={{ fontSize: '0.8rem' }}
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-globe me-1"></i>
                {locale === 'pt-BR' ? 'PT' : 'EN'}
              </button>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark">
                <li>
                  <button
                    className={`dropdown-item ${locale === 'pt-BR' ? 'active' : ''}`}
                    onClick={() => handleLocaleChange('pt-BR')}
                  >
                    🇧🇷 Português (BR)
                  </button>
                </li>
                <li>
                  <button
                    className={`dropdown-item ${locale === 'en-US' ? 'active' : ''}`}
                    onClick={() => handleLocaleChange('en-US')}
                  >
                    🇺🇸 English (US)
                  </button>
                </li>
              </ul>
            </div>

            {/* Seletor de Moeda */}
            <div className="dropdown">
              <button
                className="btn btn-link text-white text-decoration-none p-0 dropdown-toggle"
                style={{ fontSize: '0.8rem' }}
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-currency-exchange me-1"></i>
                {currency}
              </button>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-dark">
                <li>
                  <button
                    className={`dropdown-item ${currency === 'BRL' ? 'active' : ''}`}
                    onClick={() => handleCurrencyChange('BRL')}
                  >
                    R$ BRL (Real)
                  </button>
                </li>
                <li>
                  <button
                    className={`dropdown-item ${currency === 'USD' ? 'active' : ''}`}
                    onClick={() => handleCurrencyChange('USD')}
                  >
                    $ USD (Dólar)
                  </button>
                </li>
              </ul>
            </div>
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
                NoBugs Store
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
            {/* Busca - Mobile */}
            <button
              className="btn btn-link text-dark d-lg-none p-0"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <i className="bi bi-search" style={{ fontSize: '1.3rem' }}></i>
            </button>

            {/* Conta */}
            <div className="dropdown">
              <button
                className="btn btn-link text-dark text-decoration-none p-0 dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-person" style={{ fontSize: '1.5rem' }}></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {session ? (
                  <>
                    <li>
                      <span className="dropdown-item-text small text-muted">
                        Olá, {session.user?.name?.split(' ')[0] || 'Usuário'}!
                      </span>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link href="/account" className="dropdown-item">
                        <i className="bi bi-person me-2"></i>
                        Minha Conta
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/orders" className="dropdown-item">
                        <i className="bi bi-bag me-2"></i>
                        Meus Pedidos
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/addresses" className="dropdown-item">
                        <i className="bi bi-geo-alt me-2"></i>
                        Endereços
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button
                        className="dropdown-item text-danger"
                        onClick={() => signOut()}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Sair
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link href="/auth/login" className="dropdown-item">
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Entrar
                      </Link>
                    </li>
                    <li>
                      <Link href="/auth/register" className="dropdown-item">
                        <i className="bi bi-person-plus me-2"></i>
                        Criar Conta
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

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
            <li className="nav-item">
              <Link href="/products?type=digital" className="nav-link text-dark">
                <i className="bi bi-cloud-download me-1"></i>
                Produtos Digitais
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/products?type=physical" className="nav-link text-dark">
                <i className="bi bi-box-seam me-1"></i>
                Produtos Físicos
              </Link>
            </li>
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
