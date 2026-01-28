'use client';

import Link from 'next/link';
import UserMenuDropdown from './UserMenuDropdown';
import ThemeToggleButton from '../ui/ThemeToggleButton';

export default function StoreSidebar() {
  return (
    <aside className="store-sidebar bg-white border-end">
      <div className="d-flex flex-column h-100">
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
          <Link href="/" className="text-decoration-none text-dark fw-bold">
            <i className="bi bi-bug me-2 text-primary"></i>
            NoBugs Store
          </Link>
          <ThemeToggleButton />
        </div>

        <nav className="flex-grow-1 p-3">
          <ul className="nav flex-column gap-1">
            <li className="nav-item">
              <Link href="/" className="nav-link text-dark">
                <i className="bi bi-house me-2"></i>
                Início
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/products" className="nav-link text-dark">
                <i className="bi bi-grid me-2"></i>
                Produtos
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/products?type=digital" className="nav-link text-dark">
                <i className="bi bi-cloud-download me-2"></i>
                Digitais
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/products?type=physical" className="nav-link text-dark">
                <i className="bi bi-box-seam me-2"></i>
                Físicos
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/blog" className="nav-link text-dark">
                <i className="bi bi-journal-richtext me-2"></i>
                Blog
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/cart" className="nav-link text-dark">
                <i className="bi bi-cart3 me-2"></i>
                Carrinho
              </Link>
            </li>
          </ul>
        </nav>

        <div className="border-top p-3 d-flex align-items-center justify-content-between">
          <UserMenuDropdown />
          <Link href="/account" className="btn btn-sm btn-outline-primary">
            Conta
          </Link>
        </div>
      </div>
    </aside>
  );
}
