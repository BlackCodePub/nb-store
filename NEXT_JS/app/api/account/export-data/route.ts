import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';
import { processDataExport } from '../../../../src/server/privacy/lgpd-service';

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

    // Dispara processamento assíncrono (em produção, substituir por job/queue)
    void processDataExport(exportRequest.id);

    return NextResponse.json({
      success: true,
      requestId: exportRequest.id,
      message: 'Solicitação de exportação criada. Você receberá um e-mail quando estiver pronta.',
    });
  } catch (error) {
    console.error('Erro ao solicitar exportação:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}
