/**
 * LGPD Service
 * Cookie consent, exportação e exclusão de dados
 */

import { prisma } from '../db/client';
import { sendEmail, buildEmailFromTemplate } from '../utils/email';

export interface CookieConsentData {
  necessary: boolean; // Sempre true
  analytics: boolean;
  marketing: boolean;
}

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    cpf: string | null;
    createdAt: Date;
  };
  addresses: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }[];
  orders: {
    id: string;
    status: string;
    total: number;
    createdAt: Date;
    itemCount: number;
  }[];
  comments: {
    postSlug: string;
    content: string;
    createdAt: Date;
  }[];
}

/**
 * Registra consentimento de cookies
 */
export async function recordCookieConsent(
  ip: string,
  userAgent: string,
  categories: CookieConsentData,
  userId?: string,
  sessionId?: string
): Promise<string> {
  const consent = await prisma.cookieConsent.create({
    data: {
      userId,
      sessionId,
      ip,
      userAgent,
      accepted: true,
      categories: categories as unknown as Record<string, boolean>,
    },
  });
  
  return consent.id;
}

/**
 * Busca último consentimento do usuário
 */
export async function getUserConsent(userId: string): Promise<CookieConsentData | null> {
  const consent = await prisma.cookieConsent.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!consent) return null;
  
  return consent.categories as unknown as CookieConsentData;
}

/**
 * Solicita exportação de dados
 */
export async function requestDataExport(userId: string): Promise<string> {
  // Verificar se já existe uma solicitação pendente/processando
  const existingRequest = await prisma.dataExportRequest.findFirst({
    where: {
      userId,
      status: { in: ['pending', 'processing'] },
    },
  });
  
  if (existingRequest) {
    return existingRequest.id;
  }
  
  const request = await prisma.dataExportRequest.create({
    data: {
      userId,
      status: 'pending',
    },
  });
  
  return request.id;
}

/**
 * Processa exportação de dados (job)
 */
export async function processDataExport(requestId: string): Promise<void> {
  const request = await prisma.dataExportRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  
  if (!request || request.status !== 'pending') return;
  
  // Marcar como processando
  await prisma.dataExportRequest.update({
    where: { id: requestId },
    data: { status: 'processing' },
  });
  
  try {
    // Coletar dados do usuário
    const userData = await collectUserData(request.userId);
    
    // Em produção, salvar arquivo em storage privado e gerar URL assinada
    // Por enquanto, apenas simulamos o processo
    const fileUrl = `/api/lgpd/export/${requestId}/download`;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const downloadUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;
    
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        fileUrl,
        completedAt: new Date(),
      },
    });

    if (request.user?.email) {
      const emailContent = await buildEmailFromTemplate('lgpd.export_ready', {
        userName: request.user.name ? ` ${request.user.name}` : '',
        downloadUrl,
      });
      const sent = await sendEmail({
        to: request.user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (!sent) {
        console.warn('[LGPD] Failed to send data export email', {
          requestId,
          userId: request.userId,
        });
      }
    }
    
  } catch (error) {
    console.error('[LGPD] Export error:', error);
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: 'failed' },
    });
  }
}

/**
 * Coleta todos os dados do usuário
 */
export async function collectUserData(userId: string): Promise<UserDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: true,
      orders: {
        include: {
          _count: { select: { items: true } },
        },
      },
      comments: {
        include: {
          post: { select: { slug: true } },
        },
      },
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      cpf: user.cpf,
      createdAt: user.createdAt,
    },
    addresses: user.addresses.map(a => ({
      name: a.name,
      street: a.street,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode,
    })),
    orders: user.orders.map(o => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      itemCount: o._count.items,
    })),
    comments: user.comments.map(c => ({
      postSlug: c.post.slug,
      content: c.content,
      createdAt: c.createdAt,
    })),
  };
}

/**
 * Solicita exclusão de dados (anonimização)
 */
export async function requestDataDeletion(userId: string): Promise<void> {
  // Verificar se existem pedidos pendentes
  const pendingOrders = await prisma.order.count({
    where: {
      userId,
      status: { in: ['pending', 'paid', 'processing'] },
    },
  });
  
  if (pendingOrders > 0) {
    throw new Error('Não é possível excluir conta com pedidos em andamento');
  }
  
  // Anonimizar dados em vez de excluir
  // Isso preserva integridade referencial para histórico
  
  await prisma.$transaction(async (tx) => {
    // Anonimizar usuário
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@anonimizado.local`,
        name: 'Usuário Removido',
        phone: null,
        cpf: null,
        passwordHash: null,
        image: null,
        birthDate: null,
      },
    });
    
    // Remover endereços
    await tx.userAddress.deleteMany({ where: { userId } });
    
    // Remover contas OAuth
    await tx.account.deleteMany({ where: { userId } });
    
    // Remover sessões
    await tx.session.deleteMany({ where: { userId } });
    
    // Remover comentários
    await tx.comment.deleteMany({ where: { userId } });
    
    // Remover entitlements digitais
    await tx.digitalEntitlement.deleteMany({ where: { userId } });
    
    // Remover logs de download
    await tx.digitalDownloadLog.deleteMany({ where: { userId } });
  });
  
  console.log(`[LGPD] User ${userId} data anonymized`);
}

/**
 * Busca status da solicitação de exportação
 */
export async function getExportStatus(requestId: string, userId: string): Promise<{
  status: string;
  fileUrl?: string;
  completedAt?: Date;
} | null> {
  const request = await prisma.dataExportRequest.findFirst({
    where: {
      id: requestId,
      userId, // Garantir que pertence ao usuário
    },
  });
  
  if (!request) return null;
  
  return {
    status: request.status,
    fileUrl: request.fileUrl || undefined,
    completedAt: request.completedAt || undefined,
  };
}
