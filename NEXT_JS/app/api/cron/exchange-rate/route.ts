/**
 * Cron Job: Exchange Rate Update
 * Executa diariamente para atualizar a taxa de câmbio BRL/USD
 * 
 * Configure no Vercel:
 * vercel.json: { "crons": [{ "path": "/api/cron/exchange-rate", "schedule": "0 6 * * *" }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateExchangeRateJob } from '../../../../src/server/fx/exchange-rate-service';

// Vercel Cron authorization header
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verificar autorização do cron
  const authHeader = request.headers.get('authorization');
  
  // Em dev, permitir sem auth
  if (process.env.NODE_ENV === 'production') {
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  const result = await updateExchangeRateJob();
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Exchange rate updated',
      rate: result.rate,
      timestamp: new Date().toISOString(),
    });
  }
  
  return NextResponse.json({
    success: false,
    error: result.error,
    timestamp: new Date().toISOString(),
  }, { status: 500 });
}

// Também permitir POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
