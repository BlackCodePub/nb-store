/**
 * Re-exporta as opções de autenticação
 * Este arquivo existe para compatibilidade com imports @/lib/auth
 */
import { buildAuthOptions } from '../server/auth/options';

// Export default auth options for store
export const authOptions = buildAuthOptions('store');

// Also export buildAuthOptions for cases where admin is needed
export { buildAuthOptions };
