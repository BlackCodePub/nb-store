/**
 * API: Cotação de frete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getShippingQuotes, isValidZipCode, normalizeZipCode } from '../../../../src/server/shipping/correios-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zipCode = searchParams.get('zipCode');
    
    if (!zipCode) {
      return NextResponse.json(
        { error: 'CEP é obrigatório' },
        { status: 400 }
      );
    }
    
    const normalized = normalizeZipCode(zipCode);
    
    if (!isValidZipCode(normalized)) {
      return NextResponse.json(
        { error: 'CEP inválido' },
        { status: 400 }
      );
    }
    
    // Dimensões padrão para cotação simples
    // Em produção, calcular baseado nos produtos do carrinho
    const defaultItems = [
      {
        weight: 0.5, // 500g
        length: 20,
        height: 10,
        width: 15,
      },
    ];
    
    const quotes = await getShippingQuotes(normalized, defaultItems);
    
    // Filtrar erros
    const validQuotes = quotes.filter(q => !q.error);
    const errors = quotes.filter(q => q.error);
    
    return NextResponse.json({
      zipCode: normalized,
      quotes: validQuotes,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[API /shipping/quote] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular frete' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zipCode, items } = body;
    
    if (!zipCode) {
      return NextResponse.json(
        { error: 'CEP é obrigatório' },
        { status: 400 }
      );
    }
    
    const normalized = normalizeZipCode(zipCode);
    
    if (!isValidZipCode(normalized)) {
      return NextResponse.json(
        { error: 'CEP inválido' },
        { status: 400 }
      );
    }
    
    // Usar itens fornecidos ou padrão
    const shippingItems = items?.length > 0 ? items : [
      { weight: 0.5, length: 20, height: 10, width: 15 },
    ];
    
    const quotes = await getShippingQuotes(normalized, shippingItems);
    
    const validQuotes = quotes.filter(q => !q.error);
    const errors = quotes.filter(q => q.error);
    
    return NextResponse.json({
      zipCode: normalized,
      quotes: validQuotes,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[API /shipping/quote] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular frete' },
      { status: 500 }
    );
  }
}
