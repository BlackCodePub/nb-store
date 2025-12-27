import { prisma } from '../db/client';

// Tipos para RBAC
export interface UserWithRoles {
  id: string;
  roles: {
    role: {
      id: string;
      name: string;
      level: number;
      isAdmin: boolean;
    };
  }[];
}

/**
 * Verifica se o usuário é admin (tem alguma role com isAdmin = true)
 */
export async function userIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return roles.some((link) => link.role.isAdmin);
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  if (!userId) return false;
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });
  return roles.some((link) => link.role.permissions.some((rp) => rp.permission.key === permissionKey));
}

/**
 * Retorna o nível mais alto (menor número = mais privilégio) do usuário
 * Retorna Infinity se não tiver nenhuma role
 */
export async function getUserLevel(userId: string): Promise<number> {
  if (!userId) return Infinity;
  
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  if (roles.length === 0) return Infinity;

  // Menor nível = mais privilégio
  return Math.min(...roles.map((r) => r.role.level));
}

/**
 * Retorna todas as roles do usuário
 */
export async function getUserRoles(userId: string) {
  if (!userId) return [];
  
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  return userRoles.map((ur) => ur.role);
}

/**
 * Retorna todas as permissões do usuário (de todas as roles)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  if (!userId) return [];

  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const permissions = new Set<string>();
  roles.forEach((link) => {
    link.role.permissions.forEach((rp) => {
      permissions.add(rp.permission.key);
    });
  });

  return Array.from(permissions);
}

/**
 * Verifica se o usuário atual pode gerenciar outro usuário
 * Regra: só pode gerenciar usuários com nível >= ao seu (maior número = menos privilégio)
 */
export async function canManageUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (!currentUserId || !targetUserId) return false;
  
  // Usuário não pode gerenciar a si mesmo em certas operações
  if (currentUserId === targetUserId) return false;

  const [currentLevel, targetLevel] = await Promise.all([
    getUserLevel(currentUserId),
    getUserLevel(targetUserId),
  ]);

  // Só pode gerenciar se tiver nível menor (mais privilégio)
  return currentLevel < targetLevel;
}

/**
 * Verifica se o usuário pode atribuir uma role específica
 * Regra: só pode atribuir roles com nível >= ao seu
 */
export async function canAssignRole(userId: string, roleId: string): Promise<boolean> {
  if (!userId || !roleId) return false;

  const [userLevel, role] = await Promise.all([
    getUserLevel(userId),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!role) return false;

  // Só pode atribuir roles com nível maior ou igual (menos privilégio)
  return userLevel <= role.level;
}

/**
 * Lista usuários que o usuário atual pode gerenciar
 */
export async function listManageableUsers(currentUserId: string) {
  const currentLevel = await getUserLevel(currentUserId);

  // Buscar usuários com nível maior (menos privilégio)
  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      roles: {
        every: {
          role: {
            level: { gt: currentLevel },
          },
        },
      },
    },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  // Incluir também usuários sem roles (têm nível Infinity)
  const usersWithoutRoles = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      roles: { none: {} },
    },
  });

  return [...users, ...usersWithoutRoles.map((u) => ({ ...u, roles: [] }))];
}

/**
 * Verifica múltiplas permissões (AND - todas devem ser verdadeiras)
 */
export async function userHasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  if (!userId || permissions.length === 0) return false;

  for (const permission of permissions) {
    if (!(await userHasPermission(userId, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Verifica múltiplas permissões (OR - pelo menos uma deve ser verdadeira)
 */
export async function userHasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  if (!userId || permissions.length === 0) return false;

  for (const permission of permissions) {
    if (await userHasPermission(userId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Lista todas as roles disponíveis para atribuição pelo usuário
 */
export async function listAssignableRoles(userId: string) {
  const userLevel = await getUserLevel(userId);
  const isAdmin = await userIsAdmin(userId);

  // Admin pode atribuir qualquer role
  if (isAdmin) {
    return prisma.role.findMany({
      orderBy: { level: 'asc' },
    });
  }

  // Outros podem atribuir apenas roles com nível >= ao seu
  return prisma.role.findMany({
    where: {
      level: { gte: userLevel },
    },
    orderBy: { level: 'asc' },
  });
}
