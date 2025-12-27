'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Link enviado!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-3">Reenviar verificação</h1>
      <form onSubmit={onSubmit} className="card shadow-sm p-4">
        <p className="text-muted mb-3">
          Digite seu e-mail para receber um novo link de verificação.
        </p>
        
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
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
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </Button>
        </div>
      </form>
    </section>
  );
}
