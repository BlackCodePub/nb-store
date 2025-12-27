import { NextResponse } from 'next/server';
import { prisma } from '../../../src/server/db/client';

export async function GET() {
  try {
    // Cast para any para evitar problemas de tipo
    const db = prisma as any;
    
    // Buscar todos os banners sem filtros
    const allBanners = await db.banner.findMany();
    
    // Buscar banners ativos
    const now = new Date();
    const activeBanners = await db.banner.findMany({
      where: {
        active: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({
      totalBanners: allBanners.length,
      allBanners,
      activeBanners,
      now: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
