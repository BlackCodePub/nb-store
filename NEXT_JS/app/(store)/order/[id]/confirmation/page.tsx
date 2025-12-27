import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { prisma } from '../../../../../src/server/db/client';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

// Formatar preço em BRL
function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

// Formatar data
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

// Traduzir método de pagamento
function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    pix: 'PIX',
    boleto: 'Boleto Bancário',
  };
  return names[method] || method;
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;

  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    redirect('/login?from=/order/' + id + '/confirmation');
  }

  const order = await prisma.order.findUnique({
    where: { 
      id,
      userId: session.user.id, // Garantir que o pedido é do usuário
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              images: { take: 1, select: { url: true } },
            },
          },
          variant: {
            select: { name: true },
          },
        },
      },
      address: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) {
    notFound();
  }

  const shippingAddress = order.address;
  const payment = order.payments[0];
  // Extrair método de pagamento do payloadJson
  const paymentMethod = (payment?.payloadJson as { method?: string } | null)?.method || 'pix';
  const installments = (payment?.payloadJson as { installments?: number } | null)?.installments || 1;
  const orderNumber = order.id.slice(-8).toUpperCase();

  return (
    <div className="container py-5">
      {/* Sucesso */}
      <div className="text-center mb-5">
        <div 
          className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-4"
          style={{ width: 80, height: 80 }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="h2 mb-2">Pedido Realizado com Sucesso!</h1>
        <p className="text-muted">
          Número do pedido: <strong>#{orderNumber}</strong>
        </p>
      </div>

      <div className="row g-4">
        {/* Instruções de Pagamento */}
        <div className="col-lg-8">
          {paymentMethod === 'pix' && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h5 className="d-flex align-items-center mb-4">
                  <svg className="me-2 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  Pagar com PIX
                </h5>
                
                <div className="row">
                  <div className="col-md-6 text-center mb-4 mb-md-0">
                    {/* Placeholder QR Code - Seria gerado pelo PagSeguro */}
                    <div 
                      className="bg-light border rounded d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: 200, height: 200 }}
                    >
                      <span className="text-muted">QR Code PIX</span>
                    </div>
                    <p className="small text-muted">
                      Escaneie o QR Code com o app do seu banco
                    </p>
                  </div>
                  <div className="col-md-6">
                    <p className="fw-semibold">Ou copie o código PIX:</p>
                    <div className="input-group mb-3">
                      <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        value="00020126360014BR.GOV.BCB.PIX..."
                        readOnly
                      />
                      <button className="btn btn-outline-primary btn-sm">
                        Copiar
                      </button>
                    </div>
                    
                    <div className="alert alert-warning small mb-0">
                      <strong>Importante:</strong> O PIX expira em 30 minutos. 
                      Após o pagamento, a confirmação é automática.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'boleto' && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h5 className="d-flex align-items-center mb-4">
                  <svg className="me-2 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Pagar com Boleto
                </h5>
                
                <p>O boleto foi gerado e enviado para o seu e-mail.</p>
                
                <div className="d-flex gap-2 mb-4">
                  <button className="btn btn-primary">
                    Visualizar Boleto
                  </button>
                  <button className="btn btn-outline-secondary">
                    Enviar por E-mail
                  </button>
                </div>
                
                <div className="alert alert-info small mb-0">
                  O boleto vence em <strong>3 dias úteis</strong>. 
                  Após o pagamento, a confirmação pode levar até 2 dias úteis.
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'credit_card' && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <svg className="me-2 text-success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  <h5 className="mb-0">Pagamento com Cartão</h5>
                </div>
                <p className="text-muted mb-0">
                  Seu pagamento está sendo processado. 
                  Você receberá um e-mail assim que for aprovado.
                </p>
              </div>
            </div>
          )}

          {/* Itens do Pedido */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">Itens do Pedido</h5>
            </div>
            <div className="card-body p-0">
              {order.items.map((item) => (
                <div key={item.id} className="d-flex p-3 border-bottom">
                  <div 
                    className="bg-light rounded me-3 flex-shrink-0"
                    style={{ width: 60, height: 60 }}
                  >
                    {item.product.images[0]?.url && (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        className="w-100 h-100 object-fit-cover rounded"
                      />
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <Link 
                      href={`/product/${item.product.slug}`}
                      className="text-decoration-none text-dark fw-semibold"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <small className="d-block text-muted">
                        {item.variant.name}
                      </small>
                    )}
                    <small className="text-muted">
                      Qtd: {item.quantity} × {formatPrice(item.price)}
                    </small>
                  </div>
                  <div className="text-end">
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="col-lg-4">
          {/* Endereço de Entrega */}
          {shippingAddress && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h6 className="mb-3">
                  <svg className="me-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Endereço de Entrega
                </h6>
                <p className="small mb-1">{shippingAddress.name}</p>
                <p className="small text-muted mb-1">
                  {shippingAddress.street}, {shippingAddress.number}
                  {shippingAddress.complement && ` - ${shippingAddress.complement}`}
                </p>
                <p className="small text-muted mb-1">
                  {shippingAddress.neighborhood} • {shippingAddress.city}/{shippingAddress.state}
                </p>
                <p className="small text-muted mb-0">
                  CEP: {shippingAddress.zipCode}
                </p>
              </div>
            </div>
          )}

          {/* Envio */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h6 className="mb-3">
                <svg className="me-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                Envio
              </h6>
              <p className="small mb-0 text-muted">
                Seu pedido será enviado em breve
              </p>
            </div>
          </div>

          {/* Totais */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="mb-3">Resumo</h6>
              
              <div className="d-flex justify-content-between small mb-2">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              
              <div className="d-flex justify-content-between small mb-2">
                <span>Frete</span>
                <span>{formatPrice(order.shippingTotal)}</span>
              </div>
              
              {order.discountTotal > 0 && (
                <div className="d-flex justify-content-between small mb-2 text-success">
                  <span>Desconto</span>
                  <span>- {formatPrice(order.discountTotal)}</span>
                </div>
              )}
              
              <hr className="my-2" />
              
              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong className="text-primary">{formatPrice(order.total)}</strong>
              </div>
              
              <small className="text-muted d-block mt-2">
                {getPaymentMethodName(paymentMethod)}
                {installments > 1 && (
                  <> em {installments}x</>
                )}
              </small>
            </div>
          </div>

          {/* Ações */}
          <div className="d-grid gap-2 mt-4">
            <Link href="/account/orders" className="btn btn-outline-primary">
              Ver Meus Pedidos
            </Link>
            <Link href="/" className="btn btn-link text-decoration-none">
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
