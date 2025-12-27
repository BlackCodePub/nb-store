'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';

function ResetConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setMessage({ type: 'error', text: 'Link inválido. Solicite um novo link de recuperação.' });
    }
  }, [token, email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao redefinir senha.' });
        return;
      }

      setMessage({ type: 'success', text: 'Senha alterada com sucesso! Redirecionando...' });
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <section className="container py-5" style={{ maxWidth: 480 }}>
        <div className="card shadow-sm p-4 text-center">
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
          <h2 className="mt-3">Link inválido</h2>
          <p className="text-muted">O link de recuperação é inválido ou expirou.</p>
          <Link href="/reset" className="btn btn-primary">
            Solicitar novo link
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-3">Criar nova senha</h1>
      <form onSubmit={onSubmit} className="card shadow-sm p-4">
        <p className="text-muted mb-3">
          Criando nova senha para: <strong>{email}</strong>
        </p>
        
        <Input
          label="Nova senha"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        
        <Input
          label="Confirmar nova senha"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />

        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} py-2`}>
            {message.text}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center">
          <Link href="/login" className="text-decoration-none">
            Voltar ao login
          </Link>
          <Button type="submit" disabled={loading || message?.type === 'success'}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function ResetConfirmPage() {
  return (
    <Suspense fallback={
      <section className="container py-5" style={{ maxWidth: 480 }}>
        <div className="card shadow-sm p-4 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </section>
    }>
      <ResetConfirmContent />
    </Suspense>
  );
}
