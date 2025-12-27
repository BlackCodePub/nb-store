import path from 'path';

const nextConfig = {
  sassOptions: {
    includePaths: [
      path.join(process.cwd(), 'node_modules'),
      path.join(process.cwd(), 'node_modules', 'bootstrap-sass-modules', 'scss'),
    ],
  },
  // Permitir acesso de IPs locais/VPN durante desenvolvimento
  allowedDevOrigins: [
    'http://26.164.196.78:3000',
  ],
};

export default nextConfig;
