'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Por favor, informe um e-mail válido.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Inscrição realizada com sucesso! 🎉' });
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao realizar inscrição.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group input-group-lg mb-3">
        <input
          type="email"
          className="form-control"
          placeholder="Seu melhor e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-dark"
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm me-2"></span>
          ) : (
            <i className="bi bi-send me-2"></i>
          )}
          Inscrever
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} py-2`}>
          {message.text}
        </div>
      )}

      <small className="opacity-75">
        <i className="bi bi-shield-check me-1"></i>
        Seus dados estão seguros. Você pode cancelar a qualquer momento.
      </small>
    </form>
  );
}
