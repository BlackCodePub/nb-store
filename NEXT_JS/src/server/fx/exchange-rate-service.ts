/**
 * Exchange Rate Service
 * Busca e gerencia taxas de câmbio BRL/USD
 */

import { prisma } from '../db/client';

const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/BRL';
const FALLBACK_RATE = 0.20; // Taxa fallback: 1 BRL = 0.20 USD

export interface ExchangeRateResult {
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  fetchedAt: Date;
  isStale: boolean;
}

/**
 * Busca a taxa de câmbio atual da API externa
 */
export async function fetchExchangeRateFromAPI(): Promise<number> {
  try {
    const response = await fetch(EXCHANGE_API_URL, {
      next: { revalidate: 3600 }, // Cache por 1 hora
    });
    
    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status}`);
    }
    
    const data = await response.json();
    const rate = data.rates?.USD;
    
    if (!rate || typeof rate !== 'number') {
      throw new Error('Invalid rate from API');
    }
    
    return rate;
  } catch (error) {
    console.error('[FX] Error fetching exchange rate:', error);
    throw error;
  }
}

/**
 * Salva a taxa de câmbio no banco
 */
export async function saveExchangeRate(rate: number): Promise<void> {
  await prisma.exchangeRate.create({
    data: {
      fromCurrency: 'BRL',
      toCurrency: 'USD',
      rate,
      fetchedAt: new Date(),
    },
  });
}

/**
 * Busca a taxa mais recente do banco
 */
export async function getLatestExchangeRate(): Promise<ExchangeRateResult | null> {
  const latest = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: 'BRL',
      toCurrency: 'USD',
    },
    orderBy: {
      fetchedAt: 'desc',
    },
  });
  
  if (!latest) {
    return null;
  }
  
  // Considera stale se tiver mais de 24 horas
  const now = new Date();
  const hoursSinceFetch = (now.getTime() - latest.fetchedAt.getTime()) / (1000 * 60 * 60);
  
  return {
    rate: latest.rate,
    fromCurrency: latest.fromCurrency,
    toCurrency: latest.toCurrency,
    fetchedAt: latest.fetchedAt,
    isStale: hoursSinceFetch > 24,
  };
}

/**
 * Obtém a taxa de câmbio (do banco ou API)
 */
export async function getCurrentExchangeRate(): Promise<ExchangeRateResult> {
  // Tenta pegar do banco primeiro
  const cached = await getLatestExchangeRate();
  
  if (cached && !cached.isStale) {
    return cached;
  }
  
  // Se não tem ou está stale, busca da API
  try {
    const rate = await fetchExchangeRateFromAPI();
    await saveExchangeRate(rate);
    
    return {
      rate,
      fromCurrency: 'BRL',
      toCurrency: 'USD',
      fetchedAt: new Date(),
      isStale: false,
    };
  } catch (error) {
    // Se falhou e tem cache (mesmo stale), usa ele
    if (cached) {
      console.warn('[FX] Using stale rate due to API error');
      return cached;
    }
    
    // Último recurso: taxa fallback
    console.error('[FX] Using fallback rate');
    return {
      rate: FALLBACK_RATE,
      fromCurrency: 'BRL',
      toCurrency: 'USD',
      fetchedAt: new Date(),
      isStale: true,
    };
  }
}

/**
 * Converte BRL para USD
 */
export async function convertBRLtoUSD(amountBRL: number): Promise<{ amountUSD: number; rate: number }> {
  const { rate } = await getCurrentExchangeRate();
  return {
    amountUSD: Number((amountBRL * rate).toFixed(2)),
    rate,
  };
}

/**
 * Converte USD para BRL
 */
export async function convertUSDtoBRL(amountUSD: number): Promise<{ amountBRL: number; rate: number }> {
  const { rate } = await getCurrentExchangeRate();
  return {
    amountBRL: Number((amountUSD / rate).toFixed(2)),
    rate,
  };
}

/**
 * Job para atualização diária da taxa
 * Chamado pelo cron
 */
export async function updateExchangeRateJob(): Promise<{ success: boolean; rate?: number; error?: string }> {
  try {
    const rate = await fetchExchangeRateFromAPI();
    await saveExchangeRate(rate);
    
    console.log(`[FX Job] Updated exchange rate: 1 BRL = ${rate} USD`);
    
    return { success: true, rate };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FX Job] Failed to update exchange rate:', message);
    
    return { success: false, error: message };
  }
}
