import { PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const DEFAULT_TENANT_ID =
  process.env.DEFAULT_TENANT_ID ?? '6e788f7f-c233-4cb8-bbde-c0b855e564be';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [tenants, memberships, defaultTenant] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenantMembership.count(),
    prisma.tenant.findUnique({
      where: { id: DEFAULT_TENANT_ID },
      select: { id: true, slug: true },
    }),
  ]);

  const result = {
    service: 'tenant',
    checks: [
      { name: 'Tenants', ok: tenants > 0, count: tenants },
      { name: 'Memberships', ok: memberships >= 0, count: memberships },
      {
        name: 'Default tenant',
        ok: defaultTenant !== null && defaultTenant.slug === 'omnixys',
        count: defaultTenant ? 1 : 0,
      },
    ],
  };

  console.log('VALIDATE_JSON:' + JSON.stringify(result));
}

main()
  .catch((e) => {
    console.error('Validate failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
