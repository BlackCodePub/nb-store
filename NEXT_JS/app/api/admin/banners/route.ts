import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

// GET - Listar todos os banners
export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar banners.' },
      { status: 500 }
    );
  }
}

// POST - Criar novo banner
export async function POST(request: Request) {
  try {
    const session = await getServerSession(buildAuthOptions('admin'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    
    const isAdmin = await userIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      buttonText,
      position,
      active,
      startsAt,
      endsAt,
    } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: 'Título e URL da imagem são obrigatórios.' },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl,
        linkUrl: linkUrl || null,
        buttonText: buttonText || null,
        position: position || 0,
        active: active ?? true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      { error: 'Erro ao criar banner.' },
      { status: 500 }
    );
  }
}
