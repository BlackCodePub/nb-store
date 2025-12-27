'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, requiredPermissions, fallback }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.push('/login?from=admin');
      return;
    }

    // Verificar permissões via API
    const checkPermissions = async () => {
      try {
        const res = await fetch('/api/admin/check-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: requiredPermissions || [] }),
        });

        if (res.ok) {
          const data = await res.json();
          setIsAllowed(data.allowed);
          if (!data.allowed) {
            router.push('/');
          }
        } else {
          setIsAllowed(false);
          router.push('/');
        }
      } catch {
        setIsAllowed(false);
        router.push('/');
      }
    };

    checkPermissions();
  }, [session, status, router, requiredPermissions]);

  if (status === 'loading' || isAllowed === null) {
    return fallback || (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
