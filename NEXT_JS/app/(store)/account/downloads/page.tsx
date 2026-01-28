'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Download {
  id: string;
  fileName: string;
  path: string;
  type: string;
  maxDownloads: number | null;
  remainingDownloads: number | null;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  downloadsCount: number;
  lastDownloads: {
    downloadedAt: string;
    ip: string;
  }[];
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      const res = await fetch('/api/account/downloads');
      if (res.ok) {
        const data = await res.json();
        setDownloads(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao carregar downloads');
      }
    } catch (err) {
      console.error('Erro ao carregar downloads:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (download: Download) => {
    if (download.isExpired) {
      alert('Este download expirou.');
      return;
    }

    if (download.remainingDownloads !== null && download.remainingDownloads <= 0) {
      alert('Limite de downloads atingido.');
      return;
    }

    setDownloading(download.id);
    
    try {
      // Redireciona para a API de download que gera o link assinado
      window.location.href = `/api/downloads/${download.id}`;
      
      // Atualizar lista após um delay para refletir o novo download
      setTimeout(() => {
        fetchDownloads();
        setDownloading(null);
      }, 2000);
    } catch (err) {
      console.error('Erro ao iniciar download:', err);
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expirado';
    if (diffDays === 0) return 'Expira hoje';
    if (diffDays === 1) return 'Expira amanhã';
    if (diffDays <= 7) return `Expira em ${diffDays} dias`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
        <p className="mt-2 text-muted">Carregando downloads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Meus Downloads</h2>
        <span className="badge bg-primary">{downloads.length} arquivo(s)</span>
      </div>

      {downloads.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-cloud-download text-muted" style={{ fontSize: '4rem' }}></i>
            <h4 className="mt-3">Nenhum download disponível</h4>
            <p className="text-muted mb-4">
              Você ainda não possui arquivos digitais para download.
            </p>
            <Link href="/products" className="btn btn-primary">
              <i className="bi bi-shop me-2"></i>
              Ver produtos
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {downloads.map((download) => (
            <div key={download.id} className="col-12">
              <div className={`card shadow-sm ${download.isExpired ? 'border-danger' : ''}`}>
                <div className="card-body">
                  <div className="row align-items-center">
                    {/* Ícone e nome do arquivo */}
                    <div className="col-md-5">
                      <div className="d-flex align-items-center">
                        <div 
                          className={`p-3 rounded me-3 ${download.isExpired ? 'bg-danger bg-opacity-10' : 'bg-primary bg-opacity-10'}`}
                        >
                          <i 
                            className={`bi bi-file-earmark-arrow-down ${download.isExpired ? 'text-danger' : 'text-primary'}`} 
                            style={{ fontSize: '1.5rem' }}
                          ></i>
                        </div>
                        <div>
                          <h5 className="mb-1">{download.fileName}</h5>
                          <small className="text-muted">
                            Disponibilizado em {formatDate(download.createdAt)}
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="col-md-4">
                      <div className="d-flex flex-wrap gap-3">
                        <div>
                          <small className="text-muted d-block">Downloads</small>
                          <strong>{download.downloadsCount}</strong>
                          {download.remainingDownloads !== null && (
                            <small className="text-muted d-block">Restam {download.remainingDownloads}</small>
                          )}
                        </div>
                        {download.expiresAt && (
                          <div>
                            <small className="text-muted d-block">Validade</small>
                            <span className={download.isExpired ? 'text-danger' : ''}>
                              {formatRelativeTime(download.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="col-md-3 text-md-end mt-3 mt-md-0">
                      <button
                        className={`btn ${download.isExpired ? 'btn-outline-secondary' : 'btn-primary'}`}
                        onClick={() => handleDownload(download)}
                        disabled={download.isExpired || downloading === download.id}
                      >
                        {downloading === download.id ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Iniciando...
                          </>
                        ) : download.isExpired ? (
                          <>
                            <i className="bi bi-x-circle me-2"></i>
                            Expirado
                          </>
                        ) : (
                          <>
                            <i className="bi bi-download me-2"></i>
                            Baixar
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Histórico de downloads */}
                  {download.lastDownloads.length > 0 && (
                    <div className="mt-3 pt-3 border-top">
                      <details>
                        <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                          <i className="bi bi-clock-history me-1"></i>
                          Histórico de downloads ({download.lastDownloads.length})
                        </summary>
                        <div className="mt-2">
                          <ul className="list-unstyled small text-muted mb-0">
                            {download.lastDownloads.map((dl, index) => (
                              <li key={index} className="py-1">
                                <i className="bi bi-check-circle text-success me-2"></i>
                                {formatDate(dl.downloadedAt)}
                                <span className="ms-2 text-muted">({dl.ip})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="alert alert-info mt-4">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Sobre seus downloads:</strong>
        <ul className="mb-0 mt-2">
          <li>Os arquivos são entregues através de links seguros e temporários.</li>
          <li>Cada download é registrado para sua segurança.</li>
          <li>Alguns arquivos podem ter limite de validade ou número de downloads.</li>
          <li>Em caso de problemas, entre em contato com nosso suporte.</li>
        </ul>
      </div>
    </div>
  );
}
