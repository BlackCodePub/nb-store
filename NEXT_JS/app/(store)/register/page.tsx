"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data?.error || 'Falha ao registrar');
      return;
    }
    setMessage('Conta criada! Você já pode entrar.');
  };

  return (
    <section className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-3">Criar conta</h1>
      <form onSubmit={onSubmit} className="card shadow-sm p-4">
        <Input label="Nome" name="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Senha"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint="Mínimo 10 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 especial"
        />
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {message && <div className="alert alert-success py-2">{message}</div>}
        <div className="d-flex justify-content-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Registrar'}
          </Button>
        </div>
      </form>
      <p className="mt-3">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </section>
  );
}
