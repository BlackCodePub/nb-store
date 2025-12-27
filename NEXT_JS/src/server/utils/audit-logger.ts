/**
 * Audit Logger
 * Registra ações importantes para auditoria
 */

import { prisma } from '../db/client';

export type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_reset'
  | 'user.email_verified'
  | 'user.profile_updated'
  | 'user.data_exported'
  | 'user.data_deleted'
  | 'order.created'
  | 'order.paid'
  | 'order.cancelled'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.refunded'
  | 'payment.created'
  | 'payment.webhook_received'
  | 'payment.status_changed'
  | 'download.accessed'
  | 'download.completed'
  | 'admin.user_created'
  | 'admin.user_updated'
  | 'admin.user_deleted'
  | 'admin.role_assigned'
  | 'admin.product_created'
  | 'admin.product_updated'
  | 'admin.product_deleted'
  | 'admin.order_updated'
  | 'admin.comment_moderated'
  | 'security.rate_limited'
  | 'security.invalid_token'
  | 'security.suspicious_activity';

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  targetId?: string;
  targetType?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra entrada no log de auditoria
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // Por enquanto, usando OrderEvent como tabela de log
    // Em produção, criar uma tabela dedicada AuditLog
    if (entry.targetType === 'order' && entry.targetId) {
      await prisma.orderEvent.create({
        data: {
          orderId: entry.targetId,
          userId: entry.userId,
          action: entry.action,
          payload: {
            ip: entry.ip,
            userAgent: entry.userAgent,
            ...entry.metadata,
          },
        },
      });
    } else {
      // Log no console para outras ações
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...entry,
      };
      
      // Em produção, enviar para serviço de logging
      // (CloudWatch, Datadog, etc.)
      console.log('[AUDIT]', JSON.stringify(logEntry));
    }
  } catch (error) {
    // Não falhar a operação principal por erro de log
    console.error('[AUDIT] Failed to log:', error);
  }
}

/**
 * Helper para log de ações de usuário
 */
export function logUserAction(
  action: AuditAction,
  userId: string,
  request?: Request,
  metadata?: Record<string, unknown>
): void {
  const ip = request?.headers.get('x-forwarded-for') || 
             request?.headers.get('x-real-ip') || 
             undefined;
  const userAgent = request?.headers.get('user-agent') || undefined;
  
  logAudit({
    action,
    userId,
    ip,
    userAgent,
    metadata,
  });
}

/**
 * Helper para log de ações admin
 */
export function logAdminAction(
  action: AuditAction,
  adminUserId: string,
  targetId: string,
  targetType: string,
  metadata?: Record<string, unknown>
): void {
  logAudit({
    action,
    userId: adminUserId,
    targetId,
    targetType,
    metadata: {
      adminId: adminUserId,
      ...metadata,
    },
  });
}

/**
 * Helper para log de segurança
 */
export function logSecurityEvent(
  action: 'security.rate_limited' | 'security.invalid_token' | 'security.suspicious_activity',
  ip: string,
  metadata: Record<string, unknown>
): void {
  logAudit({
    action,
    ip,
    metadata,
  });
  
  // Em produção, pode-se adicionar alertas para eventos de segurança
  if (action === 'security.suspicious_activity') {
    console.warn('[SECURITY ALERT]', { action, ip, metadata });
  }
}
