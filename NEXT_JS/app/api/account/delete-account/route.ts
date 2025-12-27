import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { prisma } from '../../../../src/server/db/client';

// DELETE - Excluir conta do usuário (LGPD)
export async function DELETE() {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          select: { id: true, status: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se há pedidos em processamento
    const pendingOrders = user.orders.filter(
      (order) => ['pending', 'processing', 'shipped'].includes(order.status)
    );

    if (pendingOrders.length > 0) {
      return NextResponse.json(
        { error: 'Você tem pedidos em andamento. Aguarde a conclusão antes de excluir a conta.' },
        { status: 400 }
      );
    }

    // Anonimizar pedidos (manter para fins fiscais, mas desvincular do usuário)
    await prisma.order.updateMany({
      where: { userId },
      data: { userId: 'deleted-user' },
    });

    // Excluir dados relacionados (cascade no schema cuida da maioria)
    // Mas vamos ser explícitos para alguns:
    
    // Excluir carrinho
    await prisma.cart.deleteMany({ where: { userId } });
    
    // Excluir endereços
    await prisma.userAddress.deleteMany({ where: { userId } });
    
    // Excluir sessões
    await prisma.session.deleteMany({ where: { userId } });
    
    // Excluir contas OAuth
    await prisma.account.deleteMany({ where: { userId } });
    
    // Excluir solicitações de exportação
    await prisma.dataExportRequest.deleteMany({ where: { userId } });
    
    // Excluir comentários
    await prisma.comment.deleteMany({ where: { userId } });

    // Por fim, excluir o usuário
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      message: 'Conta excluída com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    return NextResponse.json({ error: 'Erro ao processar exclusão' }, { status: 500 });
  }
}
