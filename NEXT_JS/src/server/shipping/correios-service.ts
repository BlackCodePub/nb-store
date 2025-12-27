/**
 * Correios Shipping Service
 * API direta dos Correios para cotação de frete
 */

// Códigos dos serviços dos Correios
export const CORREIOS_SERVICES = {
  PAC: '04510',
  SEDEX: '04014',
  SEDEX_10: '40215',
  SEDEX_12: '40169',
  SEDEX_HOJE: '40290',
} as const;

export type CorreiosServiceCode = keyof typeof CORREIOS_SERVICES;

export interface ShippingQuoteRequest {
  originZipCode: string;
  destinationZipCode: string;
  weight: number; // kg
  length: number; // cm
  height: number; // cm
  width: number;  // cm
  services?: CorreiosServiceCode[];
  declaredValue?: number; // Valor declarado em R$
}

export interface ShippingQuoteResult {
  serviceCode: string;
  serviceName: string;
  price: number;
  deliveryDays: number;
  error?: string;
}

// Dimensões mínimas dos Correios (cm)
const MIN_LENGTH = 16;
const MIN_HEIGHT = 2;
const MIN_WIDTH = 11;

// Peso mínimo (kg)
const MIN_WEIGHT = 0.3;

// CEP da loja (configurável via env)
const STORE_ZIP_CODE = process.env.STORE_ZIP_CODE || '01310100'; // São Paulo default

/**
 * Normaliza CEP removendo caracteres não numéricos
 */
export function normalizeZipCode(zipCode: string): string {
  return zipCode.replace(/\D/g, '');
}

/**
 * Valida formato do CEP
 */
export function isValidZipCode(zipCode: string): boolean {
  const normalized = normalizeZipCode(zipCode);
  return /^\d{8}$/.test(normalized);
}

/**
 * Calcula preço de frete usando API dos Correios
 * 
 * Nota: A API pública dos Correios tem limitações. Para produção,
 * considere usar o contrato empresarial ou serviços como Melhor Envio
 */
export async function calculateShipping(
  request: ShippingQuoteRequest
): Promise<ShippingQuoteResult[]> {
  const {
    originZipCode,
    destinationZipCode,
    weight,
    length,
    height,
    width,
    services = ['PAC', 'SEDEX'],
    declaredValue = 0,
  } = request;
  
  // Normalizar CEPs
  const origin = normalizeZipCode(originZipCode);
  const destination = normalizeZipCode(destinationZipCode);
  
  // Validar CEPs
  if (!isValidZipCode(origin) || !isValidZipCode(destination)) {
    throw new Error('CEP inválido');
  }
  
  // Aplicar dimensões mínimas
  const finalLength = Math.max(length, MIN_LENGTH);
  const finalHeight = Math.max(height, MIN_HEIGHT);
  const finalWidth = Math.max(width, MIN_WIDTH);
  const finalWeight = Math.max(weight, MIN_WEIGHT);
  
  const results: ShippingQuoteResult[] = [];
  
  for (const service of services) {
    const serviceCode = CORREIOS_SERVICES[service];
    
    try {
      const result = await fetchCorreiosQuote({
        serviceCode,
        origin,
        destination,
        weight: finalWeight,
        length: finalLength,
        height: finalHeight,
        width: finalWidth,
        declaredValue,
      });
      
      results.push({
        serviceCode,
        serviceName: getServiceName(service),
        price: result.price,
        deliveryDays: result.deliveryDays,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      results.push({
        serviceCode,
        serviceName: getServiceName(service),
        price: 0,
        deliveryDays: 0,
        error: message,
      });
    }
  }
  
  return results;
}

/**
 * Busca cotação na API dos Correios
 */
async function fetchCorreiosQuote(params: {
  serviceCode: string;
  origin: string;
  destination: string;
  weight: number;
  length: number;
  height: number;
  width: number;
  declaredValue: number;
}): Promise<{ price: number; deliveryDays: number }> {
  const {
    serviceCode,
    origin,
    destination,
    weight,
    length,
    height,
    width,
    declaredValue,
  } = params;
  
  // URL da API dos Correios (calculador de preços e prazos)
  // Formato: http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx
  const baseUrl = 'http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx';
  
  const queryParams = new URLSearchParams({
    nCdEmpresa: '', // Código da empresa (vazio para consulta pública)
    sDsSenha: '',   // Senha (vazio para consulta pública)
    nCdServico: serviceCode,
    sCepOrigem: origin,
    sCepDestino: destination,
    nVlPeso: weight.toString(),
    nCdFormato: '1', // 1 = caixa/pacote
    nVlComprimento: length.toString(),
    nVlAltura: height.toString(),
    nVlLargura: width.toString(),
    nVlDiametro: '0',
    sCdMaoPropria: 'N',
    nVlValorDeclarado: declaredValue.toString(),
    sCdAvisoRecebimento: 'N',
    StrRetorno: 'xml',
  });
  
  const url = `${baseUrl}?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache por 1 hora
    });
    
    if (!response.ok) {
      throw new Error(`Correios API error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Parse simples do XML
    const price = parseXmlValue(xmlText, 'Valor');
    const days = parseXmlValue(xmlText, 'PrazoEntrega');
    const error = parseXmlValue(xmlText, 'MsgErro');
    
    if (error) {
      throw new Error(error);
    }
    
    return {
      price: parseFloat(price.replace(',', '.')) || 0,
      deliveryDays: parseInt(days, 10) || 0,
    };
  } catch (error) {
    console.error('[Correios] API error:', error);
    throw error;
  }
}

/**
 * Parse simples de valor do XML
 */
function parseXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() || '';
}

/**
 * Nome amigável do serviço
 */
function getServiceName(service: CorreiosServiceCode): string {
  const names: Record<CorreiosServiceCode, string> = {
    PAC: 'PAC - Encomenda Econômica',
    SEDEX: 'SEDEX - Entrega Expressa',
    SEDEX_10: 'SEDEX 10 - Entrega até 10h',
    SEDEX_12: 'SEDEX 12 - Entrega até 12h',
    SEDEX_HOJE: 'SEDEX Hoje',
  };
  return names[service] || service;
}

/**
 * Cotação simplificada a partir do CEP da loja
 */
export async function getShippingQuotes(
  destinationZipCode: string,
  items: { weight: number; length: number; height: number; width: number }[]
): Promise<ShippingQuoteResult[]> {
  // Calcular dimensões totais (simplificado)
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  
  // Para múltiplos itens, usar a maior dimensão de cada
  const maxLength = Math.max(...items.map(i => i.length), MIN_LENGTH);
  const maxWidth = Math.max(...items.map(i => i.width), MIN_WIDTH);
  const totalHeight = items.reduce((sum, i) => sum + i.height, 0);
  
  return calculateShipping({
    originZipCode: STORE_ZIP_CODE,
    destinationZipCode,
    weight: totalWeight,
    length: maxLength,
    height: Math.min(totalHeight, 100), // Max 100cm
    width: maxWidth,
    services: ['PAC', 'SEDEX'],
  });
}
