/**
 * API: Get Current Exchange Rate
 * Retorna a taxa de câmbio atual BRL/USD
 */

import { NextResponse } from 'next/server';
import { getCurrentExchangeRate, convertBRLtoUSD } from '../../../../src/server/fx/exchange-rate-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get('amount');
    
    const exchangeRate = await getCurrentExchangeRate();
    
    // Se passou um valor, converte
    if (amount) {
      const amountBRL = parseFloat(amount);
      if (!isNaN(amountBRL)) {
        const { amountUSD } = await convertBRLtoUSD(amountBRL);
        return NextResponse.json({
          ...exchangeRate,
          conversion: {
            brl: amountBRL,
            usd: amountUSD,
          },
        });
      }
    }
    
    return NextResponse.json(exchangeRate);
  } catch (error) {
    console.error('[API /fx/rate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get exchange rate' },
      { status: 500 }
    );
  }
}
