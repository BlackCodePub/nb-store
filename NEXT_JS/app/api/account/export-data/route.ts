import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';

// POST - Solicitar exportação de dados (LGPD)
export async function POST() {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    // Verificar se já existe uma solicitação pendente
    const existingRequest = await prisma.dataExportRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação de exportação em andamento.' },
        { status: 400 }
      );
    }

    // Criar solicitação de exportação
    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        userId: session.user.id,
        status: 'pending',
      },
    });

    // TODO: Em produção, isso seria processado por um job de background
    // que coleta todos os dados do usuário e envia por e-mail

    return NextResponse.json({
      success: true,
      requestId: exportRequest.id,
      message: 'Solicitação de exportação criada. Você receberá um e-mail em até 48 horas.',
    });
  } catch (error) {
    console.error('Erro ao solicitar exportação:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}
