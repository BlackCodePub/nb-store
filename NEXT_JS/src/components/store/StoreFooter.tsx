import Link from 'next/link';

export default function StoreFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light pt-5 pb-3">
      <div className="container">
        <div className="row g-4">
          {/* Sobre */}
          <div className="col-lg-4">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-bug me-2"></i>
              NoBugs Store
            </h5>
            <p className="text-muted small">
              Loja especializada em produtos digitais e físicos de alta qualidade.
              Pagamento seguro via PagSeguro e entrega rápida em todo o Brasil.
            </p>
            <div className="d-flex gap-3">
              <a href="#" className="text-light">
                <i className="bi bi-discord" style={{ fontSize: '1.5rem' }}></i>
              </a>
              <a href="#" className="text-light">
                <i className="bi bi-instagram" style={{ fontSize: '1.5rem' }}></i>
              </a>
              <a href="#" className="text-light">
                <i className="bi bi-youtube" style={{ fontSize: '1.5rem' }}></i>
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div className="col-6 col-lg-2">
            <h6 className="fw-bold mb-3">Navegação</h6>
            <ul className="list-unstyled small">
              <li className="mb-2">
                <Link href="/" className="text-muted text-decoration-none">
                  Início
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/products" className="text-muted text-decoration-none">
                  Produtos
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/products?type=digital" className="text-muted text-decoration-none">
                  Digitais
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/products?type=physical" className="text-muted text-decoration-none">
                  Físicos
                </Link>
              </li>
            </ul>
          </div>

          {/* Conta */}
          <div className="col-6 col-lg-2">
            <h6 className="fw-bold mb-3">Minha Conta</h6>
            <ul className="list-unstyled small">
              <li className="mb-2">
                <Link href="/account" className="text-muted text-decoration-none">
                  Meu Perfil
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/account/orders" className="text-muted text-decoration-none">
                  Meus Pedidos
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/account/addresses" className="text-muted text-decoration-none">
                  Endereços
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/cart" className="text-muted text-decoration-none">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          {/* Ajuda */}
          <div className="col-6 col-lg-2">
            <h6 className="fw-bold mb-3">Ajuda</h6>
            <ul className="list-unstyled small">
              <li className="mb-2">
                <Link href="/about" className="text-muted text-decoration-none">
                  Sobre Nós
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/faq" className="text-muted text-decoration-none">
                  FAQ
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/contact" className="text-muted text-decoration-none">
                  Contato
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/terms" className="text-muted text-decoration-none">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>

          {/* Pagamento */}
          <div className="col-6 col-lg-2">
            <h6 className="fw-bold mb-3">Pagamento</h6>
            <div className="d-flex flex-wrap gap-2">
              <span className="badge bg-secondary">
                <i className="bi bi-credit-card me-1"></i>
                Cartão
              </span>
              <span className="badge bg-secondary">
                <i className="bi bi-upc me-1"></i>
                Boleto
              </span>
              <span className="badge bg-secondary">
                <i className="bi bi-qr-code me-1"></i>
                PIX
              </span>
            </div>
            <div className="mt-3">
              <small className="text-muted">Pagamento seguro via</small>
              <div className="fw-bold text-success mt-1">
                <i className="bi bi-shield-check me-1"></i>
                PagSeguro
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <hr className="my-4 border-secondary" />
        <div className="row align-items-center">
          <div className="col-md-6 text-center text-md-start mb-2 mb-md-0">
            <small className="text-muted">
              © {currentYear} NoBugs Store. Todos os direitos reservados.
            </small>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <small className="text-muted">
              <Link href="/privacy" className="text-muted text-decoration-none me-3">
                Privacidade
              </Link>
              <Link href="/terms" className="text-muted text-decoration-none">
                Termos
              </Link>
            </small>
          </div>
        </div>
      </div>
    </footer>
  );
}
