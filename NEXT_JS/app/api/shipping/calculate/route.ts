import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/server/db/client';

interface ShippingItem {
  productId: string;
  quantity: number;
}

interface CalculateRequest {
  zipCode: string;
  items: ShippingItem[];
}

// CEP de origem (sua loja)
const ORIGIN_ZIP = '01310100'; // São Paulo - ajuste conforme necessário

// Dimensões padrão para cálculo (em cm)
const DEFAULT_DIMENSIONS = {
  weight: 0.5, // kg
  height: 10, // cm
  width: 15, // cm
  length: 20, // cm
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CalculateRequest;
    const { zipCode, items } = body;

    // Validar CEP
    const cleanZip = zipCode.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      return NextResponse.json(
        { error: 'CEP inválido' },
        { status: 400 }
      );
    }

    // Buscar produtos para pegar dimensões
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        type: true,
      },
    });

    // Verificar se algum produto é digital (frete grátis)
    const hasOnlyDigital = products.every((p) => p.type === 'digital');
    if (hasOnlyDigital) {
      return NextResponse.json({
        options: [
          {
            service: 'Download',
            code: 'DIGITAL',
            price: 0,
            estimatedDays: 0,
            description: 'Produto Digital - Entrega Imediata',
          },
        ],
      });
    }

    // Calcular peso total (usando peso padrão já que Product não tem campo weight)
    let totalWeight = 0;
    for (const item of items) {
      const weight = DEFAULT_DIMENSIONS.weight;
      totalWeight += weight * item.quantity;
    }

    // Garantir peso mínimo
    totalWeight = Math.max(totalWeight, 0.3);

    // Tentar API dos Correios
    try {
      const options = await calculateCorreios(cleanZip, totalWeight);
      return NextResponse.json({ options });
    } catch {
      // Fallback: cálculo simulado baseado na região
      const options = calculateFallback(cleanZip, totalWeight);
      return NextResponse.json({ options });
    }
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular frete' },
      { status: 500 }
    );
  }
}

// Cálculo via API dos Correios
async function calculateCorreios(destZip: string, weight: number) {
  const services = [
    { code: '04510', name: 'PAC' },
    { code: '04014', name: 'SEDEX' },
  ];

  const results = [];

  for (const service of services) {
    try {
      // URL da API dos Correios (versão gratuita/simulação)
      const params = new URLSearchParams({
        nCdEmpresa: '',
        sDsSenha: '',
        nCdServico: service.code,
        sCepOrigem: ORIGIN_ZIP,
        sCepDestino: destZip,
        nVlPeso: weight.toString(),
        nCdFormato: '1', // Caixa/Pacote
        nVlComprimento: DEFAULT_DIMENSIONS.length.toString(),
        nVlAltura: DEFAULT_DIMENSIONS.height.toString(),
        nVlLargura: DEFAULT_DIMENSIONS.width.toString(),
        nVlDiametro: '0',
        sCdMaoPropria: 'N',
        nVlValorDeclarado: '0',
        sCdAvisoRecebimento: 'N',
      });

      const url = `http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx/CalcPrecoPrazo?${params}`;
      
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      const text = await res.text();
      
      // Parse XML response
      const priceMatch = text.match(/<Valor>([^<]+)<\/Valor>/);
      const daysMatch = text.match(/<PrazoEntrega>([^<]+)<\/PrazoEntrega>/);
      const errorMatch = text.match(/<MsgErro>([^<]+)<\/MsgErro>/);

      if (errorMatch && errorMatch[1]) {
        console.warn(`Correios error for ${service.name}:`, errorMatch[1]);
        continue;
      }

      if (priceMatch && daysMatch) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        const days = parseInt(daysMatch[1], 10);

        if (price > 0) {
          results.push({
            service: service.name,
            code: service.code,
            price,
            estimatedDays: days,
            description: service.name === 'PAC' 
              ? 'PAC - Encomenda Econômica'
              : 'SEDEX - Entrega Expressa',
          });
        }
      }
    } catch (e) {
      console.warn(`Erro ao calcular ${service.name}:`, e);
    }
  }

  if (results.length === 0) {
    throw new Error('Nenhum serviço disponível');
  }

  return results;
}

// Fallback: cálculo baseado na região
function calculateFallback(destZip: string, weight: number) {
  // Primeiro dígito do CEP indica a região
  const region = parseInt(destZip[0], 10);

  // Tabela de preços base por região (simulada)
  const regionMultipliers: Record<number, number> = {
    0: 1.0,  // Grande São Paulo
    1: 1.0,  // Interior SP
    2: 1.2,  // RJ e ES
    3: 1.3,  // MG
    4: 1.4,  // BA e SE
    5: 1.5,  // PE, AL, PB, RN
    6: 1.6,  // CE, PI, MA, PA, AP, AM, RR, AC
    7: 1.5,  // DF, GO, TO, MT, MS, RO
    8: 1.3,  // PR e SC
    9: 1.4,  // RS
  };

  const multiplier = regionMultipliers[region] || 1.5;
  const basePrice = 15 + (weight * 10); // R$ 15 base + R$ 10/kg

  return [
    {
      service: 'PAC',
      code: '04510',
      price: Math.round(basePrice * multiplier * 100) / 100,
      estimatedDays: Math.round(5 + region),
      description: 'PAC - Encomenda Econômica',
    },
    {
      service: 'SEDEX',
      code: '04014',
      price: Math.round(basePrice * multiplier * 1.8 * 100) / 100,
      estimatedDays: Math.max(1, Math.round((5 + region) / 2)),
      description: 'SEDEX - Entrega Expressa',
    },
  ];
}
