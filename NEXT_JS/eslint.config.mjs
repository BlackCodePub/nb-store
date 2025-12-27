import nextConfig from 'eslint-config-next';

/**
 * ESLint flat config usando preset do Next.js (flat).
 */
export default Array.isArray(nextConfig) ? nextConfig : [nextConfig];
