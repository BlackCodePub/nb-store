'use client';

import { useState, useEffect } from 'react';

interface CookieConsentData {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [consent, setConsent] = useState<CookieConsentData>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  
  useEffect(() => {
    // Verificar se já tem consentimento
    const stored = localStorage.getItem('cookie_consent');
    if (!stored) {
      // Aguardar um pouco antes de mostrar
      setTimeout(() => setShow(true), 1500);
    }
  }, []);
  
  const saveConsent = async (data: CookieConsentData) => {
    try {
      await fetch('/api/lgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'consent',
          categories: data,
        }),
      });
      
      localStorage.setItem('cookie_consent', JSON.stringify(data));
      setShow(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  };
  
  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
  };
  
  const acceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };
  
  const saveCustomized = () => {
    saveConsent(consent);
  };
  
  if (!show) return null;
  
  return (
    <div 
      className="position-fixed bottom-0 start-0 end-0 bg-dark text-white p-3 shadow-lg"
      style={{ zIndex: 9999 }}
    >
      <div className="container">
        {!showCustomize ? (
          <div className="row align-items-center">
            <div className="col-lg-8 mb-3 mb-lg-0">
              <p className="mb-0">
                <i className="bi bi-cookie me-2"></i>
                Este site usa cookies para melhorar sua experiência. 
                Ao continuar navegando, você concorda com nossa{' '}
                <a href="/privacy" className="text-light">Política de Privacidade</a>.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <div className="d-flex gap-2 justify-content-lg-end">
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() => setShowCustomize(true)}
                >
                  Personalizar
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={acceptNecessary}
                >
                  Apenas Necessários
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={acceptAll}
                >
                  Aceitar Todos
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                <i className="bi bi-sliders me-2"></i>
                Personalizar Cookies
              </h6>
              <button
                className="btn btn-link text-light btn-sm p-0"
                onClick={() => setShowCustomize(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="necessary"
                    checked={true}
                    disabled
                  />
                  <label className="form-check-label" htmlFor="necessary">
                    <strong>Necessários</strong>
                    <small className="d-block text-muted">
                      Essenciais para o funcionamento do site
                    </small>
                  </label>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="analytics"
                    checked={consent.analytics}
                    onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="analytics">
                    <strong>Análise</strong>
                    <small className="d-block text-muted">
                      Nos ajudam a entender como você usa o site
                    </small>
                  </label>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="marketing"
                    checked={consent.marketing}
                    onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="marketing">
                    <strong>Marketing</strong>
                    <small className="d-block text-muted">
                      Usados para publicidade personalizada
                    </small>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="text-end">
              <button
                className="btn btn-primary btn-sm"
                onClick={saveCustomized}
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
