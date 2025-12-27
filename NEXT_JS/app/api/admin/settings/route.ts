import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin } from '../../../../src/server/auth/rbac';
import { prisma } from '../../../../src/server/db/client';

// Configurações padrão
const DEFAULT_SETTINGS = {
  // Geral
  storeName: 'nb-store',
  storeEmail: '',
  storePhone: '',
  storeLogo: '',
  storeFavicon: '',
  
  // Localização
  language: 'pt-BR',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  
  // Pagamento
  pagseguroEnabled: false,
  pagseguroSandbox: true,
  
  // Frete
  correiosEnabled: false,
  correiosCepOrigem: '',
  freteGratisMinimo: 0,
  
  // Discord
  discordEnabled: false,
  discordClientId: '',
  discordGuildId: '',
  
  // LGPD
  privacyPolicy: '',
  termsOfService: '',
  cookieConsent: true,
  dataRetentionDays: 365,
};

export async function GET() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // Buscar configurações do banco
  const settings = await prisma.setting.findMany();
  
  // Converter para objeto
  const settingsObj = { ...DEFAULT_SETTINGS };
  for (const setting of settings) {
    try {
      (settingsObj as Record<string, unknown>)[setting.key] = JSON.parse(setting.value);
    } catch {
      (settingsObj as Record<string, unknown>)[setting.key] = setting.value;
    }
  }

  return NextResponse.json({ settings: settingsObj });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const isAdmin = await userIsAdmin(session.user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Salvar cada configuração
    const operations = Object.entries(body).map(([key, value]) => {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      return prisma.setting.upsert({
        where: { key },
        create: { key, value: stringValue },
        update: { value: stringValue },
      });
    });

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
