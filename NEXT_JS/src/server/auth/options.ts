// Opções do NextAuth com Discord + Credentials validando no Prisma.
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from '../db/client';

const providers = [] as NextAuthOptions['providers'];
const secureCookies = process.env.NODE_ENV === 'production';
const cookiePrefix = secureCookies ? '__Secure-' : '';
const cookieBaseName = process.env.auth_cookie_name || 'nb_store_session';
const adminCookieBaseName = process.env.admin_auth_cookie_name || cookieBaseName;

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    })
  );
}

if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;

      const normalizedEmail = credentials.email.toLowerCase().trim();
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      } as any;
    },
  })
);

function buildCookieConfig(baseName: string) {
  return {
    sessionToken: {
      name: `${cookiePrefix}${baseName}`,
      options: {
        httpOnly: true,
        secure: secureCookies,
        path: '/',
        sameSite: 'lax' as const,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}${baseName}.callback`,
      options: {
        httpOnly: true,
        secure: secureCookies,
        path: '/',
        sameSite: 'lax' as const,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}${baseName}.csrf`,
      options: {
        httpOnly: true,
        secure: secureCookies,
        path: '/',
        sameSite: 'lax' as const,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}${baseName}.pkce`,
      options: {
        httpOnly: true,
        secure: secureCookies,
        path: '/',
        sameSite: 'lax' as const,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `${cookiePrefix}${baseName}.state`,
      options: {
        httpOnly: true,
        secure: secureCookies,
        path: '/',
        sameSite: 'lax' as const,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    nonce: {
      name: `${cookiePrefix}${baseName}.nonce`,
      options: {
        httpOnly: true,
        secure: secureCookies,
        path: '/',
        sameSite: 'lax' as const,
      },
    },
  } satisfies NextAuthOptions['cookies'];
}

export function buildAuthOptions(hostSegment: 'admin' | 'store' | 'any' = 'store'): NextAuthOptions {
  // Por enquanto, não usamos cookies customizados para evitar problemas de sessão
  // const baseName = hostSegment === 'admin' ? adminCookieBaseName : cookieBaseName;
  return {
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: 'jwt' },
    providers,
    // cookies: buildCookieConfig(baseName), // Desativado temporariamente - usando padrão NextAuth
    callbacks: {
      async jwt({ token, user }) {
        // Se houver um user (login recente), adiciona o id ao token
        if (user) {
          token.sub = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        // Garantir que o id do usuário esteja presente na sessão para checagens de permissão
        if (!session.user) session.user = {} as any;
        if (token?.sub) {
          (session.user as any).id = token.sub;
        }
        return session;
      },
    },
    pages: {
      signIn: '/login',
    },
  } satisfies NextAuthOptions;
}

export const authOptions = buildAuthOptions();

export function isStrongPassword(password: string) {
  // Política: mínimo 6 chars para permitir login
  // A validação mais forte deve ser feita no registro, não no login
  return password.length >= 6;
}
