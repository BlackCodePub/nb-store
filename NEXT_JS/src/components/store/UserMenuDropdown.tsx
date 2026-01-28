'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export default function UserMenuDropdown() {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: [] }),
        });
        if (!res.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await res.json();
        setIsAdmin(Boolean(data?.isAdmin));
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [session?.user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminLink = isAdmin ? '/admin' : '/account';
  const adminLabel = isAdmin ? 'Painel Admin' : 'Minha Conta';

  return (
    <div className="dropdown" ref={menuRef}>
      <button
        className="btn btn-link text-dark text-decoration-none p-0 dropdown-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <i className="bi bi-person" style={{ fontSize: '1.5rem' }}></i>
      </button>
      <ul className={`dropdown-menu dropdown-menu-end ${open ? 'show' : ''}`}>
        {session ? (
          <>
            <li>
              <span className="dropdown-item-text small text-muted">
                Olá, {session.user?.name?.split(' ')[0] || 'Usuário'}!
              </span>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <Link href="/account/profile" className="dropdown-item">
                <i className="bi bi-person-badge me-2"></i>
                Perfil
              </Link>
            </li>
            <li>
              <Link href={adminLink} className="dropdown-item">
                <i className={`bi ${isAdmin ? 'bi-speedometer2' : 'bi-person'} me-2`}></i>
                {adminLabel}
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
              <Link href="/login" className="dropdown-item">
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/register" className="dropdown-item">
                <i className="bi bi-person-plus me-2"></i>
                Criar Conta
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
