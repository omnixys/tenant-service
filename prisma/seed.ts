import { PrismaClient } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { isUUID } from 'class-validator';
import 'dotenv/config';

import type {
  MembershipRole,
  TenantMembership,
} from '../src/prisma/generated/client.js';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID;

interface BootstrapMembership {
  readonly userId: string;
  readonly role: MembershipRole;
}

const BOOTSTRAP_MEMBERSHIPS: readonly BootstrapMembership[] = [
  { userId: 'dde8114c-2637-462a-90b9-413924fa3f55', role: 'OWNER' },
  { userId: '694d2e8e-0932-4c8f-a1c4-e300dc235be4', role: 'ADMIN' },
  { userId: 'f9de3f8a-5b79-4f3a-9267-10c1b9ce2a03', role: 'ADMIN' },
  { userId: 'ae489d9b-96ce-4942-bcb1-c2e2a0c92e83', role: 'GUEST' },
  { userId: '20e7e44e-9bcd-4016-bebd-36f8d75357b6', role: 'MEMBER' },
  { userId: '9e219f6f-7706-4294-8b5b-a4105999846f', role: 'MEMBER' },
  { userId: '18bbde19-7e76-45dc-b204-f5c397e11362', role: 'MEMBER' },
  { userId: '550e8400-e29b-41d4-a716-446655440000', role: 'MEMBER' },
  { userId: '550e8400-e29b-41d4-a716-446655440001', role: 'MEMBER' },
];

function validateTenantId(id: string | undefined, label: string): string {
  if (!id || !isUUID(id, '4')) {
    throw new Error(`[SEED] ${label} must be a valid UUID v4`);
  }
  return id;
}

async function main(): Promise<void> {
  const bootstrapTenantId = validateTenantId(
    DEFAULT_TENANT_ID,
    'DEFAULT_TENANT_ID',
  );
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

    const memberships: TenantMembership[] = [];
    for (const membership of BOOTSTRAP_MEMBERSHIPS) {
      const userId = validateTenantId(
        membership.userId,
        `BOOTSTRAP_MEMBERSHIPS userId (${membership.role})`,
      );
      memberships.push(
        await prisma.tenantMembership.upsert({
          where: {
            tenantId_userId: { tenantId: bootstrapTenantId, userId },
          },
          update: {
            role: membership.role,
            status: 'ACTIVE',
            deletedAt: null,
            deletedBy: null,
            updatedBy: 'seed',
          },
          create: {
            tenantId: bootstrapTenantId,
            userId,
            role: membership.role,
            status: 'ACTIVE',
            createdBy: 'seed',
            updatedBy: 'seed',
          },
        }),
      );
    }

    console.log('SEED_TENANT_MEMBERSHIPS_JSON:' + JSON.stringify(memberships));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
