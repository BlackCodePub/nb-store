"use client";

import { useState } from 'react';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data?.error || 'Falha ao solicitar reset');
      return;
    }
    setMessage('Se o e-mail existir, enviaremos instruções. (placeholder)');
  };

  return (
    <section className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-3">Recuperar senha</h1>
      <form onSubmit={onSubmit} className="card shadow-sm p-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {message && <div className="alert alert-info py-2">{message}</div>}
        <div className="d-flex justify-content-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </Button>
        </div>
      </form>
    </section>
  );
}
