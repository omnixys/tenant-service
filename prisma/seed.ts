import { PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { isUUID } from 'class-validator';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID;

function validateTenantId(id: string | undefined, label: string): string {
  if (!id || !isUUID(id, '4')) {
    throw new Error(`[SEED] ${label} must be a valid UUID v4`);
  }
  return id;
}

async function main(): Promise<void> {
  const bootstrapTenantId = validateTenantId(DEFAULT_TENANT_ID, 'DEFAULT_TENANT_ID');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('[SEED] DATABASE_URL is required');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // Idempotent bootstrap of the canonical default tenant.
    const tenant = await prisma.tenant.upsert({
      where: { id: bootstrapTenantId },
      update: {
        name: 'Omnixys',
        slug: 'omnixys',
        status: 'ACTIVE',
      },
      create: {
        id: bootstrapTenantId,
        name: 'Omnixys',
        slug: 'omnixys',
        status: 'ACTIVE',
      },
    });

    console.log('SEED_TENANT_JSON:' + JSON.stringify(tenant));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
