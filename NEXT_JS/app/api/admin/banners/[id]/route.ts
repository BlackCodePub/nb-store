import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../../src/server/auth/rbac';
import { prisma } from '../../../../../src/server/db/client';

// GET - Buscar banner por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return NextResponse.json(
        { error: 'Banner não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar banner.' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar banner
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(buildAuthOptions('admin'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    
    const isAdmin = await userIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await params;
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

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl,
        linkUrl: linkUrl || null,
        buttonText: buttonText || null,
        position: position ?? 0,
        active: active ?? true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar banner.' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir banner
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(buildAuthOptions('admin'));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    
    const isAdmin = await userIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.banner.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Banner excluído com sucesso.' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir banner.' },
      { status: 500 }
    );
  }
}
