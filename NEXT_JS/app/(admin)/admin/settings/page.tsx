'use client';

import { useState, useEffect } from 'react';

interface Settings {
  // Geral
  storeName: string;
  storeEmail: string;
  storePhone: string;
  
  // Moeda e Idioma
  defaultLocale: string;
  defaultCurrency: string;
  
  // PagSeguro
  pagseguroEnv: string;
  pagseguroEmail: string;
  pagseguroToken: string;
  
  // Correios
  correiosCep: string;
  correiosContrato: string;
  correiosSenha: string;
  
  // Discord
  discordClientId: string;
  discordGuildId: string;
  
  // LGPD
  lgpdEnabled: boolean;
  cookieConsentVersion: string;
  dataRetentionDays: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({
    storeName: 'NB Store',
    storeEmail: '',
    storePhone: '',
    defaultLocale: 'pt-BR',
    defaultCurrency: 'BRL',
    pagseguroEnv: 'sandbox',
    pagseguroEmail: '',
    pagseguroToken: '',
    correiosCep: '',
    correiosContrato: '',
    correiosSenha: '',
    discordClientId: '',
    discordGuildId: '',
    lgpdEnabled: true,
    cookieConsentVersion: '1.0',
    dataRetentionDays: 365,
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  useEffect(() => {
    // Carregar configurações do servidor
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };
  
  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (field: keyof Settings, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const tabs = [
    { id: 'general', label: 'Geral', icon: 'bi-gear' },
    { id: 'locale', label: 'Idioma e Moeda', icon: 'bi-globe' },
    { id: 'payment', label: 'Pagamento', icon: 'bi-credit-card' },
    { id: 'shipping', label: 'Frete', icon: 'bi-truck' },
    { id: 'discord', label: 'Discord', icon: 'bi-discord' },
    { id: 'privacy', label: 'Privacidade', icon: 'bi-shield-check' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Configurações</h1>
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Salvando...
            </>
          ) : (
            <>
              <i className="bi bi-check-lg me-2"></i>
              Salvar Alterações
            </>
          )}
        </button>
      </div>
      
      {saved && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="bi bi-check-circle me-2"></i>
          Configurações salvas com sucesso!
          <button type="button" className="btn-close" onClick={() => setSaved(false)}></button>
        </div>
      )}
      
      <div className="row">
        {/* Tabs laterais */}
        <div className="col-md-3">
          <div className="list-group">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon} me-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Conteúdo */}
        <div className="col-md-9">
          <div className="card">
            <div className="card-body">
              
              {/* Tab: Geral */}
              {activeTab === 'general' && (
                <div>
                  <h5 className="card-title mb-4">Informações da Loja</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">Nome da Loja</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.storeName || ''}
                      onChange={(e) => handleChange('storeName', e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">E-mail de Contato</label>
                    <input
                      type="email"
                      className="form-control"
                      value={settings.storeEmail || ''}
                      onChange={(e) => handleChange('storeEmail', e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Telefone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.storePhone || ''}
                      onChange={(e) => handleChange('storePhone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              )}
              
              {/* Tab: Idioma e Moeda */}
              {activeTab === 'locale' && (
                <div>
                  <h5 className="card-title mb-4">Idioma e Moeda</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">Idioma Padrão</label>
                    <select
                      className="form-select"
                      value={settings.defaultLocale || 'pt-BR'}
                      onChange={(e) => handleChange('defaultLocale', e.target.value)}
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Moeda Padrão</label>
                    <select
                      className="form-select"
                      value={settings.defaultCurrency || 'BRL'}
                      onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                    >
                      <option value="BRL">Real Brasileiro (R$)</option>
                      <option value="USD">Dólar Americano ($)</option>
                    </select>
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    A taxa de câmbio USD/BRL é atualizada diariamente via cron job.
                  </div>
                </div>
              )}
              
              {/* Tab: Pagamento */}
              {activeTab === 'payment' && (
                <div>
                  <h5 className="card-title mb-4">PagSeguro</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">Ambiente</label>
                    <select
                      className="form-select"
                      value={settings.pagseguroEnv || 'sandbox'}
                      onChange={(e) => handleChange('pagseguroEnv', e.target.value)}
                    >
                      <option value="sandbox">Sandbox (Testes)</option>
                      <option value="production">Produção</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">E-mail da Conta</label>
                    <input
                      type="email"
                      className="form-control"
                      value={settings.pagseguroEmail || ''}
                      onChange={(e) => handleChange('pagseguroEmail', e.target.value)}
                    />
                    <div className="form-text">E-mail cadastrado no PagSeguro</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Token</label>
                    <input
                      type="password"
                      className="form-control"
                      value={settings.pagseguroToken || ''}
                      onChange={(e) => handleChange('pagseguroToken', e.target.value)}
                      placeholder="••••••••••••••••"
                    />
                    <div className="form-text">Token de autenticação da API</div>
                  </div>
                  
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Importante:</strong> Configure o webhook URL no painel do PagSeguro:
                    <code className="ms-2">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/pagseguro</code>
                  </div>
                </div>
              )}
              
              {/* Tab: Frete */}
              {activeTab === 'shipping' && (
                <div>
                  <h5 className="card-title mb-4">Correios</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">CEP de Origem</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.correiosCep || ''}
                      onChange={(e) => handleChange('correiosCep', e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <div className="form-text">CEP de onde os produtos serão enviados</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Código do Contrato (opcional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.correiosContrato || ''}
                      onChange={(e) => handleChange('correiosContrato', e.target.value)}
                    />
                    <div className="form-text">Se tiver contrato com os Correios</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Senha do Contrato (opcional)</label>
                    <input
                      type="password"
                      className="form-control"
                      value={settings.correiosSenha || ''}
                      onChange={(e) => handleChange('correiosSenha', e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {/* Tab: Discord */}
              {activeTab === 'discord' && (
                <div>
                  <h5 className="card-title mb-4">Integração Discord</h5>
                  
                  <div className="mb-3">
                    <label className="form-label">Client ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.discordClientId || ''}
                      onChange={(e) => handleChange('discordClientId', e.target.value)}
                    />
                    <div className="form-text">ID da aplicação no Discord Developer Portal</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Guild ID (Servidor)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.discordGuildId || ''}
                      onChange={(e) => handleChange('discordGuildId', e.target.value)}
                    />
                    <div className="form-text">ID do servidor Discord para verificação de roles</div>
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Configure regras de gating por produto/categoria na seção "Discord Rules".
                  </div>
                </div>
              )}
              
              {/* Tab: Privacidade */}
              {activeTab === 'privacy' && (
                <div>
                  <h5 className="card-title mb-4">LGPD e Privacidade</h5>
                  
                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="lgpdEnabled"
                        checked={settings.lgpdEnabled || false}
                        onChange={(e) => handleChange('lgpdEnabled', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="lgpdEnabled">
                        Habilitar conformidade LGPD
                      </label>
                    </div>
                    <div className="form-text">Banner de cookies, exportação e exclusão de dados</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Versão do Consentimento de Cookies</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.cookieConsentVersion || '1.0'}
                      onChange={(e) => handleChange('cookieConsentVersion', e.target.value)}
                    />
                    <div className="form-text">Atualize para forçar novo consentimento dos usuários</div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Retenção de Dados (dias)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.dataRetentionDays || 365}
                      onChange={(e) => handleChange('dataRetentionDays', parseInt(e.target.value))}
                      min={30}
                      max={3650}
                    />
                    <div className="form-text">Período de retenção de logs e dados não essenciais</div>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
