import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../../src/server/auth/options';
import { userIsAdmin, userHasPermission } from '../../../../src/server/auth/rbac';

export async function POST(req: Request) {
  const session = await getServerSession(buildAuthOptions('store'));

  if (!session?.user?.id) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const permissions = body.permissions as string[] || [];

  // Verificar se é admin
  const isAdmin = await userIsAdmin(session.user.id);
  if (isAdmin) {
    return NextResponse.json({ allowed: true, isAdmin: true });
  }

  // Se não especificou permissões, verificar se tem alguma permissão de admin
  if (permissions.length === 0) {
    const hasAnyAdminPermission = 
      await userHasPermission(session.user.id, 'catalog:write') ||
      await userHasPermission(session.user.id, 'catalog:images') ||
      await userHasPermission(session.user.id, 'orders:write') ||
      await userHasPermission(session.user.id, 'orders:export');
    
    return NextResponse.json({ allowed: hasAnyAdminPermission });
  }

  // Verificar permissões específicas
  for (const permission of permissions) {
    if (await userHasPermission(session.user.id, permission)) {
      return NextResponse.json({ allowed: true });
    }
  }

  return NextResponse.json({ allowed: false });
}
