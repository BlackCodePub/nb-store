import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';

interface ValidateRequest {
  code: string;
  subtotal: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(buildAuthOptions('store'));
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json() as ValidateRequest;
    const { code, subtotal } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código do cupom é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar cupom com contagem de redemptions
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        isActive: true,
      },
      include: {
        _count: {
          select: { redemptions: true }
        }
      }
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Cupom não encontrado ou inválido' },
        { status: 404 }
      );
    }

    // Verificar data de início
    if (coupon.startsAt && coupon.startsAt > new Date()) {
      return NextResponse.json(
        { error: 'Este cupom ainda não está válido' },
        { status: 400 }
      );
    }

    // Verificar data de expiração
    if (coupon.endsAt && coupon.endsAt < new Date()) {
      return NextResponse.json(
        { error: 'Este cupom expirou' },
        { status: 400 }
      );
    }

    // Verificar limite de uso geral
    if (coupon.maxUsesTotal && coupon._count.redemptions >= coupon.maxUsesTotal) {
      return NextResponse.json(
        { error: 'Este cupom atingiu o limite de uso' },
        { status: 400 }
      );
    }

    // Verificar limite de uso por usuário
    if (coupon.maxUsesPerUser) {
      const userRedemptions = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId: userId
        }
      });
      if (userRedemptions >= coupon.maxUsesPerUser) {
        return NextResponse.json(
          { error: 'Você já utilizou este cupom o máximo de vezes permitido' },
          { status: 400 }
        );
      }
    }

    // Verificar valor mínimo do pedido (minSubtotalCents é em centavos)
    const minOrderValue = coupon.minSubtotalCents ? coupon.minSubtotalCents / 100 : 0;
    if (subtotal < minOrderValue) {
      return NextResponse.json(
        { 
          error: `Valor mínimo para este cupom: R$ ${minOrderValue.toFixed(2).replace('.', ',')}`,
          minOrderValue,
        },
        { status: 400 }
      );
    }

    // Calcular desconto
    let discount = 0;

    if (coupon.type === 'percent') {
      // value é percentual (1-100)
      discount = subtotal * (coupon.value / 100);
    } else {
      // fixed: value é em centavos
      discount = Math.min(coupon.value / 100, subtotal);
    }

    // Arredondar para 2 casas decimais
    discount = Math.round(discount * 100) / 100;

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount,
      message: coupon.type === 'percent'
        ? `${coupon.value}% de desconto aplicado!`
        : `R$ ${(coupon.value / 100).toFixed(2).replace('.', ',')} de desconto aplicado!`,
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return NextResponse.json(
      { error: 'Erro ao validar cupom' },
      { status: 500 }
    );
  }
}
