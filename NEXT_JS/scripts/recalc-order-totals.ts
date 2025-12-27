import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const taxRate = Number(process.env.TAX_RATE ?? 0);
  if (Number.isNaN(taxRate) || taxRate < 0) {
    throw new Error('TAX_RATE inválido. Defina TAX_RATE (ex: 0.1 para 10%).');
  }

  const orders = await prisma.order.findMany({ include: { items: true } });

  for (const order of orders) {
    const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const taxTotal = Math.max(0, subtotal * taxRate);
    const total = subtotal + taxTotal;

    await prisma.order.update({
      where: { id: order.id },
      data: { subtotal, taxTotal, total },
    });
  }

  console.log(`Recalculado ${orders.length} pedidos com TAX_RATE=${taxRate}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
