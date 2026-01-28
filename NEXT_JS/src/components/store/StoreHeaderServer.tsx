import { prisma } from '../../server/db/client';
import StoreHeader from './StoreHeader';

interface StoreHeaderServerProps {
  fixed?: boolean;
}

export default async function StoreHeaderServer({ fixed = false }: StoreHeaderServerProps) {
  let storeName: string | null = null;
  let hasDigital = false;
  let hasPhysical = false;

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'storeName' } });
    if (setting?.value) {
      try {
        storeName = JSON.parse(setting.value);
      } catch {
        storeName = setting.value;
      }
    }
    const [digitalCount, physicalCount] = await Promise.all([
      prisma.product.count({ where: { active: true, type: 'digital' } }),
      prisma.product.count({ where: { active: true, type: 'physical' } }),
    ]);
    hasDigital = digitalCount > 0;
    hasPhysical = physicalCount > 0;
  } catch {
    storeName = null;
  }

  return (
    <StoreHeader
      fixed={fixed}
      storeName={storeName || 'NoBugs Store'}
      showDigital={hasDigital}
      showPhysical={hasPhysical}
    />
  );
}
