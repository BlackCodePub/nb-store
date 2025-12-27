/**
 * API: Verificar status do Discord e regras de gating
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { 
  getUserDiscordAccount, 
  getDiscordUserGuilds,
  checkProductGating,
  checkCategoryGating 
} from '../../../../src/server/discord/discord-gating-service';

// GET: Retorna status da conexão Discord do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const discordAccount = await getUserDiscordAccount(session.user.id);
    
    if (!discordAccount) {
      return NextResponse.json({
        connected: false,
        message: 'Conta Discord não conectada',
      });
    }
    
    // Se tiver token de acesso, buscar guilds
    let guilds: string[] = [];
    if (discordAccount.access_token) {
      const userGuilds = await getDiscordUserGuilds(discordAccount.access_token);
      guilds = userGuilds.map(g => g.id);
    }
    
    return NextResponse.json({
      connected: true,
      discordId: discordAccount.providerAccountId,
      guilds,
    });
  } catch (error) {
    console.error('[API /account/discord] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar Discord' },
      { status: 500 }
    );
  }
}

// POST: Verificar gating para produto/categoria específico
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { productId, categoryId } = await request.json();
    
    if (!productId && !categoryId) {
      return NextResponse.json(
        { error: 'productId ou categoryId é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar conta Discord e guilds
    const discordAccount = await getUserDiscordAccount(session.user.id);
    
    let userGuilds: string[] = [];
    let userDiscordId: string | null = null;
    
    if (discordAccount?.access_token) {
      userDiscordId = discordAccount.providerAccountId;
      const guilds = await getDiscordUserGuilds(discordAccount.access_token);
      userGuilds = guilds.map(g => g.id);
    }
    
    // Verificar gating
    if (productId) {
      const result = await checkProductGating(productId, userDiscordId, userGuilds);
      return NextResponse.json(result);
    }
    
    if (categoryId) {
      const result = await checkCategoryGating(categoryId, userDiscordId, userGuilds);
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('[API /account/discord] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar gating' },
      { status: 500 }
    );
  }
}
