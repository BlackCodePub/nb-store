'use client';

import { useState } from 'react';

export default function PrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleExportData = async () => {
    setExporting(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/account/export-data', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ 
          type: 'info', 
          text: 'Solicitação de exportação enviada! Você receberá um e-mail com seus dados em até 48 horas.' 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao solicitar exportação.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'EXCLUIR') {
      setMessage({ type: 'error', text: 'Digite EXCLUIR para confirmar.' });
      return;
    }
    
    setDeleting(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/account/delete-account', {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Redirecionar para logout/home
        window.location.href = '/api/auth/signout?callbackUrl=/';
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir conta.' });
        setShowDeleteModal(false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' });
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h5 className="mb-0">
          <i className="bi bi-shield-lock me-2"></i>
          Privacidade e Dados
        </h5>
        <small className="text-muted">Gerencie seus dados de acordo com a LGPD</small>
      </div>
      <div className="card-body">
        {message && (
          <div
            className={`alert alert-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'danger'} alert-dismissible fade show`}
            role="alert"
          >
            <i className={`bi bi-${message.type === 'success' ? 'check-circle' : message.type === 'info' ? 'info-circle' : 'exclamation-circle'} me-2`}></i>
            {message.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage(null)}
              aria-label="Fechar"
            ></button>
          </div>
        )}

        {/* Exportar Dados */}
        <div className="mb-4 pb-4 border-bottom">
          <h6 className="mb-3">
            <i className="bi bi-download me-2 text-primary"></i>
            Exportar Meus Dados
          </h6>
          <p className="text-muted mb-3">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar 
            uma cópia de todos os seus dados armazenados em nossa plataforma. Os dados serão 
            enviados para o seu e-mail em formato JSON.
          </p>
          <div className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-outline-primary"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Solicitando...
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-arrow-down me-2"></i>
                  Solicitar Exportação
                </>
              )}
            </button>
            <small className="text-muted">
              Processamento em até 48 horas
            </small>
          </div>
        </div>

        {/* Excluir Conta */}
        <div className="mb-4">
          <h6 className="mb-3 text-danger">
            <i className="bi bi-trash me-2"></i>
            Excluir Minha Conta
          </h6>
          <div className="alert alert-warning mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Atenção:</strong> Esta ação é irreversível. Todos os seus dados serão 
            permanentemente excluídos, incluindo:
            <ul className="mb-0 mt-2">
              <li>Informações de perfil</li>
              <li>Histórico de pedidos</li>
              <li>Endereços cadastrados</li>
              <li>Downloads e licenças digitais</li>
            </ul>
          </div>
          <p className="text-muted mb-3">
            Pedidos já realizados serão mantidos para fins fiscais, mas desvinculados da sua conta.
          </p>
          <button 
            className="btn btn-outline-danger"
            onClick={() => setShowDeleteModal(true)}
          >
            <i className="bi bi-trash me-2"></i>
            Excluir Minha Conta
          </button>
        </div>

        {/* Informações sobre coleta de dados */}
        <div className="mt-4 pt-3 border-top">
          <h6 className="text-muted mb-3">
            <i className="bi bi-info-circle me-2"></i>
            Sobre seus Dados
          </h6>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card bg-light border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-person me-2 text-primary"></i>
                    Dados Pessoais
                  </h6>
                  <p className="card-text small text-muted mb-0">
                    Nome, e-mail, telefone, CPF e data de nascimento.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-geo-alt me-2 text-primary"></i>
                    Endereços
                  </h6>
                  <p className="card-text small text-muted mb-0">
                    Endereços de entrega cadastrados para suas compras.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-light border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-bag me-2 text-primary"></i>
                    Pedidos
                  </h6>
                  <p className="card-text small text-muted mb-0">
                    Histórico completo de compras e transações.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Confirmar Exclusão
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados 
                  serão excluídos e você será desconectado.
                </p>
                <div className="mb-3">
                  <label className="form-label">
                    Digite <strong>EXCLUIR</strong> para confirmar:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                    placeholder="Digite EXCLUIR"
                  />
                </div>
              </div>
              <div className="modal-footer border-0">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm('');
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== 'EXCLUIR'}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-2"></i>
                      Excluir Permanentemente
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
