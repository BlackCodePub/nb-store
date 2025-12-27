/**
 * Rate Limiter
 * Proteção contra abuse de APIs
 */

// In-memory store (para desenvolvimento)
// Em produção, usar Redis
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;    // Janela de tempo em ms
  maxRequests: number; // Máximo de requests na janela
}

// Configurações padrão por tipo de operação
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Auth: mais restritivo
  'auth:login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5/15min
  'auth:register': { windowMs: 60 * 60 * 1000, maxRequests: 3 },    // 3/hora
  'auth:reset': { windowMs: 60 * 60 * 1000, maxRequests: 3 },       // 3/hora
  'auth:verify': { windowMs: 60 * 60 * 1000, maxRequests: 5 },      // 5/hora
  
  // Downloads: moderado
  'download:file': { windowMs: 60 * 1000, maxRequests: 10 },        // 10/min
  
  // Webhooks: permissivo
  'webhook:pagseguro': { windowMs: 60 * 1000, maxRequests: 100 },   // 100/min
  
  // API geral: padrão
  'api:default': { windowMs: 60 * 1000, maxRequests: 60 },          // 60/min
  
  // Comentários: moderado
  'comment:create': { windowMs: 60 * 1000, maxRequests: 5 },        // 5/min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // segundos até poder tentar novamente
}

/**
 * Verifica se request está dentro do limite
 */
export function checkRateLimit(
  key: string,
  configKey: keyof typeof RATE_LIMIT_CONFIGS = 'api:default'
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[configKey];
  const now = Date.now();
  
  // Limpar entradas expiradas periodicamente
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // Nova janela
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }
  
  // Janela existente
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  
  // Incrementar contador
  entry.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Gera chave de rate limit
 */
export function getRateLimitKey(
  ip: string,
  userId?: string,
  action?: string
): string {
  const parts = [ip];
  if (userId) parts.push(userId);
  if (action) parts.push(action);
  return parts.join(':');
}

/**
 * Helper para usar em route handlers
 */
export function rateLimitByRequest(
  request: Request,
  configKey: keyof typeof RATE_LIMIT_CONFIGS = 'api:default',
  userId?: string
): RateLimitResult {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const key = getRateLimitKey(ip, userId, configKey);
  return checkRateLimit(key, configKey);
}

/**
 * Limpa entradas expiradas do store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Reset manual de rate limit (para testes ou admin)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Estatísticas do rate limiter
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeEntries: number;
} {
  const now = Date.now();
  let activeEntries = 0;
  
  for (const entry of rateLimitStore.values()) {
    if (now <= entry.resetAt) {
      activeEntries++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    activeEntries,
  };
}
