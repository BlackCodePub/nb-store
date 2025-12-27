'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando...');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Link inválido. Solicite um novo link de verificação.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'E-mail verificado com sucesso!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Erro ao verificar e-mail.');
        }
      } catch {
        setStatus('error');
        setMessage('Erro ao conectar com o servidor.');
      }
    };

    verify();
  }, [token, email]);

  return (
    <section className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card shadow-sm p-4 text-center">
        {status === 'loading' && (
          <>
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <h2>Verificando e-mail...</h2>
            <p className="text-muted">Aguarde um momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <i className="bi bi-check-circle text-success" style={{ fontSize: '4rem' }}></i>
            <h2 className="mt-3">E-mail verificado!</h2>
            <p className="text-muted">{message}</p>
            <Link href="/login" className="btn btn-primary mt-3">
              Fazer login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '4rem' }}></i>
            <h2 className="mt-3">Ops!</h2>
            <p className="text-muted">{message}</p>
            <div className="d-flex gap-2 justify-content-center mt-3">
              <Link href="/login" className="btn btn-outline-secondary">
                Fazer login
              </Link>
              <Link href="/resend-verification" className="btn btn-primary">
                Reenviar verificação
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
