'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function PrivacyPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const handleExportData = async () => {
    if (!session?.user) return;
    
    setLoading('export');
    setMessage(null);
    
    try {
      const res = await fetch('/api/lgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao solicitar exportação' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(null);
    }
  };
  
  const handleDeleteData = async () => {
    if (!session?.user) return;
    
    const confirmed = confirm(
      'ATENÇÃO: Esta ação é irreversível!\n\n' +
      'Todos os seus dados pessoais serão anonimizados e sua conta será desativada.\n\n' +
      'Tem certeza que deseja continuar?'
    );
    
    if (!confirmed) return;
    
    setLoading('delete');
    setMessage(null);
    
    try {
      const res = await fetch('/api/lgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        // Redirecionar após alguns segundos
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir dados' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(null);
    }
  };
  
  return (
    <div className="container py-4">
      <h1 className="mb-4">Política de Privacidade</h1>
      
      <div className="row">
        <div className="col-lg-8">
          <section className="mb-5">
            <h2>1. Coleta de Dados</h2>
            <p>
              Coletamos os seguintes dados pessoais quando você utiliza nossa plataforma:
            </p>
            <ul>
              <li><strong>Dados de cadastro:</strong> nome, e-mail, CPF, telefone</li>
              <li><strong>Dados de endereço:</strong> para entrega de produtos</li>
              <li><strong>Dados de pagamento:</strong> processados por nossos parceiros (PagSeguro)</li>
              <li><strong>Dados de navegação:</strong> cookies e logs de acesso</li>
            </ul>
          </section>
          
          <section className="mb-5">
            <h2>2. Uso dos Dados</h2>
            <p>Seus dados são utilizados para:</p>
            <ul>
              <li>Processar e entregar seus pedidos</li>
              <li>Enviar comunicações sobre sua conta e pedidos</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>
          
          <section className="mb-5">
            <h2>3. Compartilhamento</h2>
            <p>
              Seus dados podem ser compartilhados com:
            </p>
            <ul>
              <li><strong>Processadores de pagamento:</strong> PagSeguro</li>
              <li><strong>Transportadoras:</strong> Correios e parceiros</li>
              <li><strong>Autoridades:</strong> quando exigido por lei</li>
            </ul>
            <p>
              <strong>Não vendemos</strong> seus dados pessoais para terceiros.
            </p>
          </section>
          
          <section className="mb-5">
            <h2>4. Seus Direitos (LGPD)</h2>
            <p>De acordo com a Lei Geral de Proteção de Dados, você tem direito a:</p>
            <ul>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar consentimentos</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>
          </section>
          
          <section className="mb-5">
            <h2>5. Cookies</h2>
            <p>Utilizamos cookies para:</p>
            <ul>
              <li><strong>Cookies necessários:</strong> funcionamento do site, autenticação</li>
              <li><strong>Cookies de análise:</strong> entender como você usa o site (opcional)</li>
              <li><strong>Cookies de marketing:</strong> publicidade personalizada (opcional)</li>
            </ul>
            <p>
              Você pode gerenciar suas preferências de cookies através do banner exibido 
              ao acessar o site.
            </p>
          </section>
          
          <section className="mb-5">
            <h2>6. Segurança</h2>
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados, 
              incluindo criptografia, controle de acesso e monitoramento de segurança.
            </p>
          </section>
          
          <section className="mb-5">
            <h2>7. Contato</h2>
            <p>
              Para dúvidas sobre privacidade ou exercer seus direitos, entre em contato:
            </p>
            <p>
              <strong>E-mail:</strong> privacidade@exemplo.com<br />
              <strong>Encarregado de Dados (DPO):</strong> [Nome do DPO]
            </p>
          </section>
          
          <p className="text-muted">
            <em>Última atualização: Dezembro de 2025</em>
          </p>
        </div>
        
        {/* Sidebar com ações LGPD */}
        <div className="col-lg-4">
          <div className="card sticky-top" style={{ top: '1rem' }}>
            <div className="card-header">
              <i className="bi bi-shield-check me-2"></i>
              Seus Dados
            </div>
            <div className="card-body">
              {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} small`}>
                  {message.text}
                </div>
              )}
              
              {session?.user ? (
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-outline-primary"
                    onClick={handleExportData}
                    disabled={loading !== null}
                  >
                    {loading === 'export' ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Solicitando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-download me-2"></i>
                        Exportar Meus Dados
                      </>
                    )}
                  </button>
                  
                  <button
                    className="btn btn-outline-danger"
                    onClick={handleDeleteData}
                    disabled={loading !== null}
                  >
                    {loading === 'delete' ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Processando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash me-2"></i>
                        Excluir Meus Dados
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-muted small mb-0">
                  <a href="/login">Faça login</a> para gerenciar seus dados.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
