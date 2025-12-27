/**
 * Discord Gating Service
 * Verifica se usuário atende aos requisitos de Discord para produtos/categorias
 */

import { prisma } from '../db/client';

export interface DiscordUserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  guilds?: DiscordGuild[];
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: number;
}

export interface GatingCheckResult {
  allowed: boolean;
  reason?: string;
  missingGuild?: string;
  missingRole?: string;
  requiredGuildName?: string;
}

/**
 * Busca informações do usuário Discord via OAuth
 */
export async function getDiscordUserInfo(accessToken: string): Promise<DiscordUserInfo | null> {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      console.error('[Discord] Failed to get user info:', response.status);
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error('[Discord] Error getting user info:', error);
    return null;
  }
}

/**
 * Busca guilds (servidores) do usuário
 */
export async function getDiscordUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      console.error('[Discord] Failed to get guilds:', response.status);
      return [];
    }
    
    return response.json();
  } catch (error) {
    console.error('[Discord] Error getting guilds:', error);
    return [];
  }
}

/**
 * Verifica se usuário tem role específico em uma guild
 * Requer bot com permissão no servidor
 */
export async function checkUserHasRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!botToken) {
    console.warn('[Discord] BOT_TOKEN not configured, skipping role check');
    return true; // Skip check se não tiver bot configurado
  }
  
  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        // Usuário não está no servidor
        return false;
      }
      console.error('[Discord] Failed to get member:', response.status);
      return false;
    }
    
    const member = await response.json();
    return member.roles?.includes(roleId) ?? false;
  } catch (error) {
    console.error('[Discord] Error checking role:', error);
    return false;
  }
}

/**
 * Verifica regras de gating para um produto
 */
export async function checkProductGating(
  productId: string,
  userDiscordId: string | null,
  userGuilds: string[] // IDs das guilds do usuário
): Promise<GatingCheckResult> {
  // Buscar regras do produto
  const rules = await prisma.discordRule.findMany({
    where: { productId },
  });
  
  if (rules.length === 0) {
    // Sem regras = permitido
    return { allowed: true };
  }
  
  if (!userDiscordId) {
    return {
      allowed: false,
      reason: 'Você precisa conectar sua conta Discord para comprar este produto',
    };
  }
  
  // Verificar cada regra
  for (const rule of rules) {
    // Verificar se está na guild
    if (!userGuilds.includes(rule.guildId)) {
      return {
        allowed: false,
        reason: 'Você precisa ser membro do servidor Discord para comprar este produto',
        missingGuild: rule.guildId,
      };
    }
    
    // Verificar role (se requerido)
    if (rule.roleId) {
      const hasRole = await checkUserHasRole(rule.guildId, userDiscordId, rule.roleId);
      if (!hasRole) {
        return {
          allowed: false,
          reason: 'Você precisa ter um cargo específico no Discord para comprar este produto',
          missingRole: rule.roleId,
        };
      }
    }
  }
  
  return { allowed: true };
}

/**
 * Verifica regras de gating para uma categoria
 */
export async function checkCategoryGating(
  categoryId: string,
  userDiscordId: string | null,
  userGuilds: string[]
): Promise<GatingCheckResult> {
  const rules = await prisma.discordRule.findMany({
    where: { categoryId },
  });
  
  if (rules.length === 0) {
    return { allowed: true };
  }
  
  if (!userDiscordId) {
    return {
      allowed: false,
      reason: 'Você precisa conectar sua conta Discord para acessar esta categoria',
    };
  }
  
  for (const rule of rules) {
    if (!userGuilds.includes(rule.guildId)) {
      return {
        allowed: false,
        reason: 'Você precisa ser membro do servidor Discord para acessar esta categoria',
        missingGuild: rule.guildId,
      };
    }
    
    if (rule.roleId) {
      const hasRole = await checkUserHasRole(rule.guildId, userDiscordId, rule.roleId);
      if (!hasRole) {
        return {
          allowed: false,
          reason: 'Você precisa ter um cargo específico no Discord para acessar esta categoria',
          missingRole: rule.roleId,
        };
      }
    }
  }
  
  return { allowed: true };
}

/**
 * Verifica gating no checkout (verifica todos os itens)
 */
export async function checkCheckoutGating(
  items: { productId: string; categoryId?: string | null }[],
  userDiscordId: string | null,
  userGuilds: string[]
): Promise<{ allowed: boolean; blockedItems: string[]; reason?: string }> {
  const blockedItems: string[] = [];
  let reason: string | undefined;
  
  for (const item of items) {
    // Verificar produto
    const productCheck = await checkProductGating(item.productId, userDiscordId, userGuilds);
    if (!productCheck.allowed) {
      blockedItems.push(item.productId);
      reason = reason || productCheck.reason;
    }
    
    // Verificar categoria (se existir)
    if (item.categoryId) {
      const categoryCheck = await checkCategoryGating(item.categoryId, userDiscordId, userGuilds);
      if (!categoryCheck.allowed) {
        if (!blockedItems.includes(item.productId)) {
          blockedItems.push(item.productId);
        }
        reason = reason || categoryCheck.reason;
      }
    }
  }
  
  return {
    allowed: blockedItems.length === 0,
    blockedItems,
    reason,
  };
}

/**
 * Obtém a conta Discord vinculada de um usuário
 */
export async function getUserDiscordAccount(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'discord',
    },
  });
  
  return account;
}
