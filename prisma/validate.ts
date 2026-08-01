import { PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const CHECKPOINT_TENANT_ID =
  process.env.CHECKPOINT_TENANT_ID ??
  'a738a3b6-c3c1-483f-926c-c25e18fd4ff2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [tenants, memberships, checkpointTenant] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenantMembership.count(),
    prisma.tenant.findUnique({
      where: { id: CHECKPOINT_TENANT_ID },
      select: { id: true, slug: true },
    }),
  ]);

  const result = {
    service: 'tenant',
    checks: [
      { name: 'Tenants', ok: tenants > 0, count: tenants },
      { name: 'Memberships', ok: memberships >= 0, count: memberships },
      {
        name: 'Checkpoint tenant',
        ok: checkpointTenant !== null && checkpointTenant.slug === 'checkpoint',
        count: checkpointTenant ? 1 : 0,
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
