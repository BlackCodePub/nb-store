/**
 * PagSeguro Payment Service
 * Integração com API do PagSeguro/PagBank para checkout
 */

// Detectar ambiente (sandbox ou production)
const PAGSEGURO_ENV = process.env.PAGSEGURO_ENV || 'sandbox';

// URLs da API conforme ambiente
const API_URLS = {
  sandbox: 'https://sandbox.api.pagseguro.com',
  production: 'https://api.pagseguro.com',
};

// URLs do checkout conforme ambiente
const CHECKOUT_URLS = {
  sandbox: 'https://sandbox.pagseguro.uol.com.br/v2/checkout',
  production: 'https://pagseguro.uol.com.br/v2/checkout',
};

// URLs de pagamento conforme ambiente
const PAYMENT_URLS = {
  sandbox: 'https://sandbox.pagseguro.uol.com.br/v2/checkout/payment.html',
  production: 'https://pagseguro.uol.com.br/v2/checkout/payment.html',
};

const PAGSEGURO_API_URL = process.env.PAGSEGURO_API_BASE || API_URLS[PAGSEGURO_ENV as keyof typeof API_URLS] || API_URLS.sandbox;
const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;
const PAGSEGURO_EMAIL = process.env.PAGSEGURO_EMAIL || process.env.PAGSEGURO_CLIENT_ID;

// Webhook secret para validação
export const PAGSEGURO_WEBHOOK_SECRET = process.env.PAGSEGURO_WEBHOOK_SECRET;

export interface PagSeguroCustomer {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

export interface PagSeguroAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface PagSeguroItem {
  id: string;
  description: string;
  quantity: number;
  amount: number; // em centavos
}

export interface PagSeguroChargeRequest {
  referenceId: string; // ID do pedido na loja
  customer: PagSeguroCustomer;
  items: PagSeguroItem[];
  shipping?: {
    address: PagSeguroAddress;
    amount: number; // em centavos
  };
  notificationUrl?: string;
  redirectUrl?: string;
}

export interface PagSeguroChargeResponse {
  id: string;
  referenceId: string;
  status: string;
  paymentLink?: string;
  qrCodeUrl?: string; // Para PIX
  boletoUrl?: string;
  charges?: PagSeguroCharge[];
}

export interface PagSeguroCharge {
  id: string;
  status: string;
  amount: {
    value: number;
    currency: string;
  };
  paymentMethod: {
    type: string;
    installments?: number;
    card?: {
      brand: string;
      lastDigits: string;
    };
  };
  paidAt?: string;
}

// Status do PagSeguro
export const PAGSEGURO_STATUS = {
  PAID: 'PAID',
  AUTHORIZED: 'AUTHORIZED',
  PENDING: 'PENDING',
  WAITING: 'WAITING',
  DECLINED: 'DECLINED',
  CANCELED: 'CANCELED',
  IN_ANALYSIS: 'IN_ANALYSIS',
} as const;

/**
 * Cria uma cobrança/checkout no PagSeguro
 */
export async function createCharge(
  request: PagSeguroChargeRequest
): Promise<PagSeguroChargeResponse> {
  if (!PAGSEGURO_TOKEN) {
    throw new Error('PAGSEGURO_TOKEN não configurado');
  }
  
  const { referenceId, customer, items, shipping, notificationUrl, redirectUrl } = request;
  
  // Calcular valor total
  const itemsTotal = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const shippingAmount = shipping?.amount || 0;
  const totalAmount = itemsTotal + shippingAmount;
  
  const payload = {
    reference_id: referenceId,
    customer: {
      name: customer.name,
      email: customer.email,
      tax_id: customer.cpf.replace(/\D/g, ''),
      phones: [
        {
          country: '55',
          area: customer.phone.slice(0, 2),
          number: customer.phone.slice(2).replace(/\D/g, ''),
          type: 'MOBILE',
        },
      ],
    },
    items: items.map(item => ({
      reference_id: item.id,
      name: item.description,
      quantity: item.quantity,
      unit_amount: item.amount,
    })),
    shipping: shipping ? {
      address: {
        street: shipping.address.street,
        number: shipping.address.number,
        complement: shipping.address.complement,
        locality: shipping.address.neighborhood,
        city: shipping.address.city,
        region_code: shipping.address.state,
        postal_code: shipping.address.zipCode.replace(/\D/g, ''),
        country: 'BRA',
      },
      amount: shipping.amount,
    } : undefined,
    notification_urls: notificationUrl ? [notificationUrl] : undefined,
    redirect_urls: redirectUrl ? {
      success: redirectUrl,
      failure: redirectUrl,
    } : undefined,
  };
  
  const response = await fetch(`${PAGSEGURO_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
      'x-api-version': '4.0',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[PagSeguro] Create charge error:', errorData);
    throw new Error(`PagSeguro API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    referenceId: data.reference_id,
    status: data.charges?.[0]?.status || 'PENDING',
    paymentLink: data.links?.find((l: { rel: string }) => l.rel === 'PAY')?.href,
    charges: data.charges,
  };
}

/**
 * Cria checkout transparente (cartão de crédito)
 */
export async function createCreditCardCharge(
  request: PagSeguroChargeRequest & {
    card: {
      encryptedData: string; // Dados criptografados do cartão
      installments: number;
    };
    billingAddress: PagSeguroAddress;
  }
): Promise<PagSeguroChargeResponse> {
  if (!PAGSEGURO_TOKEN) {
    throw new Error('PAGSEGURO_TOKEN não configurado');
  }
  
  const { referenceId, customer, items, shipping, card, billingAddress, notificationUrl } = request;
  
  const itemsTotal = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const shippingAmount = shipping?.amount || 0;
  const totalAmount = itemsTotal + shippingAmount;
  
  const payload = {
    reference_id: referenceId,
    customer: {
      name: customer.name,
      email: customer.email,
      tax_id: customer.cpf.replace(/\D/g, ''),
      phones: [
        {
          country: '55',
          area: customer.phone.slice(0, 2),
          number: customer.phone.slice(2).replace(/\D/g, ''),
          type: 'MOBILE',
        },
      ],
    },
    items: items.map(item => ({
      reference_id: item.id,
      name: item.description,
      quantity: item.quantity,
      unit_amount: item.amount,
    })),
    charges: [
      {
        reference_id: referenceId,
        description: `Pedido ${referenceId}`,
        amount: {
          value: totalAmount,
          currency: 'BRL',
        },
        payment_method: {
          type: 'CREDIT_CARD',
          installments: card.installments,
          capture: true,
          card: {
            encrypted: card.encryptedData,
            store: false,
          },
        },
        notification_urls: notificationUrl ? [notificationUrl] : undefined,
      },
    ],
    shipping: shipping ? {
      address: {
        street: shipping.address.street,
        number: shipping.address.number,
        complement: shipping.address.complement,
        locality: shipping.address.neighborhood,
        city: shipping.address.city,
        region_code: shipping.address.state,
        postal_code: shipping.address.zipCode.replace(/\D/g, ''),
        country: 'BRA',
      },
    } : undefined,
  };
  
  const response = await fetch(`${PAGSEGURO_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
      'x-api-version': '4.0',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[PagSeguro] Credit card charge error:', errorData);
    throw new Error(`PagSeguro API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    referenceId: data.reference_id,
    status: data.charges?.[0]?.status || 'PENDING',
    charges: data.charges,
  };
}

/**
 * Cria cobrança PIX
 */
export async function createPixCharge(
  request: PagSeguroChargeRequest
): Promise<PagSeguroChargeResponse & { qrCodeImage?: string; qrCodeText?: string }> {
  if (!PAGSEGURO_TOKEN) {
    throw new Error('PAGSEGURO_TOKEN não configurado');
  }
  
  const { referenceId, customer, items, shipping, notificationUrl } = request;
  
  const itemsTotal = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const shippingAmount = shipping?.amount || 0;
  const totalAmount = itemsTotal + shippingAmount;
  
  const payload = {
    reference_id: referenceId,
    customer: {
      name: customer.name,
      email: customer.email,
      tax_id: customer.cpf.replace(/\D/g, ''),
      phones: [
        {
          country: '55',
          area: customer.phone.slice(0, 2),
          number: customer.phone.slice(2).replace(/\D/g, ''),
          type: 'MOBILE',
        },
      ],
    },
    items: items.map(item => ({
      reference_id: item.id,
      name: item.description,
      quantity: item.quantity,
      unit_amount: item.amount,
    })),
    qr_codes: [
      {
        amount: {
          value: totalAmount,
        },
        expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      },
    ],
    notification_urls: notificationUrl ? [notificationUrl] : undefined,
  };
  
  const response = await fetch(`${PAGSEGURO_API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
      'x-api-version': '4.0',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[PagSeguro] PIX charge error:', errorData);
    throw new Error(`PagSeguro API error: ${response.status}`);
  }
  
  const data = await response.json();
  const qrCode = data.qr_codes?.[0];
  
  return {
    id: data.id,
    referenceId: data.reference_id,
    status: 'WAITING',
    qrCodeImage: qrCode?.links?.find((l: { media: string }) => l.media === 'image/png')?.href,
    qrCodeText: qrCode?.text,
    charges: data.charges,
  };
}

/**
 * Consulta status de uma cobrança
 */
export async function getChargeStatus(chargeId: string): Promise<{
  status: string;
  paidAt?: string;
  amount?: number;
}> {
  if (!PAGSEGURO_TOKEN) {
    throw new Error('PAGSEGURO_TOKEN não configurado');
  }
  
  const response = await fetch(`${PAGSEGURO_API_URL}/orders/${chargeId}`, {
    headers: {
      'Authorization': `Bearer ${PAGSEGURO_TOKEN}`,
      'x-api-version': '4.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`PagSeguro API error: ${response.status}`);
  }
  
  const data = await response.json();
  const charge = data.charges?.[0];
  
  return {
    status: charge?.status || data.status || 'UNKNOWN',
    paidAt: charge?.paid_at,
    amount: charge?.amount?.value,
  };
}

/**
 * Valida assinatura do webhook
 */
export function validateWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!PAGSEGURO_WEBHOOK_SECRET || !signature) {
    // Em dev, aceitar sem validação
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PagSeguro] Webhook signature validation skipped in dev');
      return true;
    }
    return false;
  }
  
  // PagSeguro usa HMAC-SHA256
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', PAGSEGURO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Mapeia status do PagSeguro para status interno do pedido
 */
export function mapPagSeguroStatus(pagseguroStatus: string): string {
  switch (pagseguroStatus) {
    case PAGSEGURO_STATUS.PAID:
    case PAGSEGURO_STATUS.AUTHORIZED:
      return 'paid';
    case PAGSEGURO_STATUS.PENDING:
    case PAGSEGURO_STATUS.WAITING:
    case PAGSEGURO_STATUS.IN_ANALYSIS:
      return 'pending';
    case PAGSEGURO_STATUS.DECLINED:
    case PAGSEGURO_STATUS.CANCELED:
      return 'cancelled';
    default:
      return 'pending';
  }
}
/**
 * Cria checkout via API clássica do PagSeguro (Redirect)
 * Esta é a forma mais simples e funciona bem no sandbox
 */
export async function createCheckoutSession(
  request: PagSeguroChargeRequest
): Promise<{ checkoutUrl: string; code: string }> {
  if (!PAGSEGURO_TOKEN || !PAGSEGURO_EMAIL) {
    throw new Error('PAGSEGURO_TOKEN ou PAGSEGURO_EMAIL não configurados');
  }
  
  const { referenceId, customer, items, shipping, notificationUrl, redirectUrl } = request;
  
  // Calcular valor total
  const itemsTotal = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const shippingAmount = shipping?.amount || 0;
  
  // Montar dados do formulário (API clássica usa form-urlencoded ou XML)
  const params = new URLSearchParams();
  
  // Credenciais
  params.append('email', PAGSEGURO_EMAIL);
  params.append('token', PAGSEGURO_TOKEN);
  
  // Referência
  params.append('reference', referenceId);
  params.append('currency', 'BRL');
  
  // Itens
  items.forEach((item, index) => {
    const i = index + 1;
    params.append(`itemId${i}`, item.id);
    params.append(`itemDescription${i}`, item.description.slice(0, 100));
    params.append(`itemAmount${i}`, (item.amount / 100).toFixed(2)); // Converter de centavos para reais
    params.append(`itemQuantity${i}`, item.quantity.toString());
  });
  
  // Frete
  if (shipping) {
    params.append('shippingType', '1'); // PAC
    params.append('shippingCost', (shippingAmount / 100).toFixed(2));
    params.append('shippingAddressStreet', shipping.address.street);
    params.append('shippingAddressNumber', shipping.address.number);
    if (shipping.address.complement) {
      params.append('shippingAddressComplement', shipping.address.complement);
    }
    params.append('shippingAddressDistrict', shipping.address.neighborhood);
    params.append('shippingAddressPostalCode', shipping.address.zipCode.replace(/\D/g, ''));
    params.append('shippingAddressCity', shipping.address.city);
    params.append('shippingAddressState', shipping.address.state);
    params.append('shippingAddressCountry', 'BRA');
  }
  
  // Cliente
  params.append('senderName', customer.name);
  params.append('senderEmail', customer.email);
  params.append('senderCPF', customer.cpf.replace(/\D/g, ''));
  
  // Formatar telefone (DDD e número separados)
  const phone = customer.phone.replace(/\D/g, '');
  if (phone.length >= 10) {
    params.append('senderAreaCode', phone.slice(0, 2));
    params.append('senderPhone', phone.slice(2));
  }
  
  // URLs
  if (notificationUrl) {
    params.append('notificationURL', notificationUrl);
  }
  if (redirectUrl) {
    params.append('redirectURL', redirectUrl);
  }
  
  // URL do checkout clássico
  const checkoutApiUrl = CHECKOUT_URLS[PAGSEGURO_ENV as keyof typeof CHECKOUT_URLS] || CHECKOUT_URLS.sandbox;
  
  console.log('[PagSeguro] Creating checkout session:', {
    url: checkoutApiUrl,
    reference: referenceId,
    email: PAGSEGURO_EMAIL,
    items: items.length,
    env: PAGSEGURO_ENV,
  });
  
  const response = await fetch(checkoutApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: params.toString(),
  });
  
  const responseText = await response.text();
  
  if (!response.ok) {
    console.error('[PagSeguro] Checkout error:', responseText);
    throw new Error(`PagSeguro checkout error: ${response.status}`);
  }
  
  // Parsear resposta XML
  const codeMatch = responseText.match(/<code>([^<]+)<\/code>/);
  if (!codeMatch) {
    console.error('[PagSeguro] Invalid response:', responseText);
    throw new Error('PagSeguro: código de checkout não encontrado');
  }
  
  const code = codeMatch[1];
  const paymentUrl = PAYMENT_URLS[PAGSEGURO_ENV as keyof typeof PAYMENT_URLS] || PAYMENT_URLS.sandbox;
  
  return {
    code,
    checkoutUrl: `${paymentUrl}?code=${code}`,
  };
}