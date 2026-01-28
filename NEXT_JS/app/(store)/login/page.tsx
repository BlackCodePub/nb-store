"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

function LoginForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const from = searchParams.get('from');
    const next = searchParams.get('next');
    const callbackUrl = searchParams.get('callbackUrl');
    
    // Prioridade: callbackUrl > next > from mapeado
    if (callbackUrl && callbackUrl.startsWith('/')) return callbackUrl;
    if (next && next.startsWith('/')) return next;
    
    // Mapeamento de aliases para paths
    const map: Record<string, string> = {
      admin: '/admin',
      'admin-orders': '/admin/orders',
      'admin-catalog': '/admin/catalog',
      checkout: '/checkout',
      cart: '/cart',
      account: '/account',
      'account/orders': '/account/orders',
      'account/profile': '/account/profile',
      'account/addresses': '/account/addresses',
      'account/security': '/account/security',
    };
    
    // Se from é um path direto (começa com /), usar diretamente
    if (from && from.startsWith('/')) return from;
    
    // Senão, usar o mapeamento
    return from ? map[from] ?? '/' : '/';
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(redirectTo || '/');
    }
  }, [status, redirectTo, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn('credentials', {
      redirect: false,
      callbackUrl: redirectTo || '/',
      email,
      password,
    });
    setLoading(false);
    if (result?.error) {
      setError('Credenciais inválidas');
      return;
    }
    if (result?.ok) {
      router.replace(result.url || redirectTo || '/');
      return;
    }
    setError('Não foi possível autenticar. Tente novamente.');
  };

  return (
    <section className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-3">Entrar</h1>
      <form onSubmit={onSubmit} className="card shadow-sm p-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="d-flex justify-content-between align-items-center">
          <Link href="/reset" className="small">
            Esqueci a senha
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </div>
      </form>
      <p className="mt-3">
        Novo aqui? <Link href="/register">Criar conta</Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <section className="container py-5" style={{ maxWidth: 480 }}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </section>
    }>
      <LoginForm />
    </Suspense>
  );
}
