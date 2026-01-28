import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../../../src/server/auth/options';
import { prisma } from '../../../../../../src/server/db/client';
import { collectUserData } from '../../../../../../src/server/privacy/lgpd-service';

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { requestId } = await params;
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const exportRequest = await prisma.dataExportRequest.findUnique({
    where: { id: requestId },
  });

  if (!exportRequest || exportRequest.userId !== session.user.id) {
    return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
  }

  if (exportRequest.status !== 'completed') {
    return NextResponse.json({ error: 'Exportação ainda não está pronta' }, { status: 409 });
  }

  const userData = await collectUserData(session.user.id);
  const fileName = `nb-store-export-${session.user.id}.json`;

  return new NextResponse(JSON.stringify(userData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
