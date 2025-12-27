import bcrypt from 'bcryptjs';
import { prisma } from '../src/server/db/client';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

const CATALOG_WRITE_EMAIL = process.env.CATALOG_WRITE_EMAIL || 'catalog-writer@example.com';
const CATALOG_WRITE_PASSWORD = process.env.CATALOG_WRITE_PASSWORD || 'changeme123';
const CATALOG_WRITE_NAME = process.env.CATALOG_WRITE_NAME || 'Catalog Writer';

const CATALOG_IMAGES_EMAIL = process.env.CATALOG_IMAGES_EMAIL || 'catalog-images@example.com';
const CATALOG_IMAGES_PASSWORD = process.env.CATALOG_IMAGES_PASSWORD || 'changeme123';
const CATALOG_IMAGES_NAME = process.env.CATALOG_IMAGES_NAME || 'Catalog Images';

const basePermissions = [
  { key: 'admin:full', description: 'Acesso total admin' },
  { key: 'catalog:write', description: 'Gerir catálogo' },
  { key: 'catalog:images', description: 'Gerir imagens do catálogo' },
  { key: 'orders:write', description: 'Gerir pedidos' },
  { key: 'orders:export', description: 'Exportar pedidos' },
];

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente para rodar o seed.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Permissions
  const permissions = await Promise.all(
    basePermissions.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: p,
        create: p,
      })
    )
  );

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { isAdmin: true, level: 1 },
    create: { name: 'admin', isAdmin: true, level: 1 },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: { isAdmin: false, level: 50 },
    create: { name: 'editor', isAdmin: false, level: 50 },
  });

  const supportRole = await prisma.role.upsert({
    where: { name: 'support' },
    update: { isAdmin: false, level: 80 },
    create: { name: 'support', isAdmin: false, level: 80 },
  });

  const catalogWriterRole = await prisma.role.upsert({
    where: { name: 'catalog-writer' },
    update: { isAdmin: false, level: 60 },
    create: { name: 'catalog-writer', isAdmin: false, level: 60 },
  });

  const catalogImagesRole = await prisma.role.upsert({
    where: { name: 'catalog-images' },
    update: { isAdmin: false, level: 90 },
    create: { name: 'catalog-images', isAdmin: false, level: 90 },
  });

  // Bind permissions to admin
  await Promise.all(
    permissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      })
    )
  );

  // Bind permissions to catalog roles
  const permCatalogWrite = permissions.find((p) => p.key === 'catalog:write');
  const permCatalogImages = permissions.find((p) => p.key === 'catalog:images');
  if (permCatalogWrite) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: catalogWriterRole.id, permissionId: permCatalogWrite.id } },
      update: {},
      create: { roleId: catalogWriterRole.id, permissionId: permCatalogWrite.id },
    });
  }
  if (permCatalogImages) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: catalogWriterRole.id, permissionId: permCatalogImages.id } },
      update: {},
      create: { roleId: catalogWriterRole.id, permissionId: permCatalogImages.id },
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: catalogImagesRole.id, permissionId: permCatalogImages.id } },
      update: {},
      create: { roleId: catalogImagesRole.id, permissionId: permCatalogImages.id },
    });
  }

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, name: ADMIN_NAME },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Catalog writer user
  const catalogWriterHash = await bcrypt.hash(CATALOG_WRITE_PASSWORD, 12);
  const catalogWriterUser = await prisma.user.upsert({
    where: { email: CATALOG_WRITE_EMAIL },
    update: { passwordHash: catalogWriterHash, name: CATALOG_WRITE_NAME },
    create: {
      email: CATALOG_WRITE_EMAIL,
      name: CATALOG_WRITE_NAME,
      passwordHash: catalogWriterHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: catalogWriterUser.id, roleId: catalogWriterRole.id } },
    update: {},
    create: { userId: catalogWriterUser.id, roleId: catalogWriterRole.id },
  });

  // Catalog images-only user
  const catalogImagesHash = await bcrypt.hash(CATALOG_IMAGES_PASSWORD, 12);
  const catalogImagesUser = await prisma.user.upsert({
    where: { email: CATALOG_IMAGES_EMAIL },
    update: { passwordHash: catalogImagesHash, name: CATALOG_IMAGES_NAME },
    create: {
      email: CATALOG_IMAGES_EMAIL,
      name: CATALOG_IMAGES_NAME,
      passwordHash: catalogImagesHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: catalogImagesUser.id, roleId: catalogImagesRole.id } },
    update: {},
    create: { userId: catalogImagesUser.id, roleId: catalogImagesRole.id },
  });

  // Catálogo inicial
  const cat = await prisma.category.upsert({
    where: { slug: 'digital' },
    update: { name: 'Produtos Digitais' },
    create: { slug: 'digital', name: 'Produtos Digitais', description: 'Itens digitais do marketplace' },
  });

  const product = await prisma.product.upsert({
    where: { slug: 'ebook-starter' },
    update: { name: 'E-book Starter', price: 49.9, currency: 'BRL', categoryId: cat.id },
    create: {
      slug: 'ebook-starter',
      name: 'E-book Starter',
      price: 49.9,
      currency: 'BRL',
      categoryId: cat.id,
      description: 'Guia inicial para clientes',
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: 'EBOOK-STARTER-STD' },
    update: { name: 'Versão PDF', stock: 9999, price: 49.9, productId: product.id },
    create: { sku: 'EBOOK-STARTER-STD', name: 'Versão PDF', stock: 9999, price: 49.9, productId: product.id },
  });

  console.log(`Seed concluido: admin ${ADMIN_EMAIL}`);
  console.log(`Seed concluido: catalog writer ${CATALOG_WRITE_EMAIL}`);
  console.log(`Seed concluido: catalog images ${CATALOG_IMAGES_EMAIL}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
