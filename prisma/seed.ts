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
  { userId: '01a05f6a-5800-71a3-b827-60db5e847bd1', role: 'OWNER' },
  { userId: '01a05f6a-5800-7e09-a743-5c1c7b465e5b', role: 'ADMIN' },
  { userId: '01a05f6a-5800-74a8-8dc6-312ac2756d62', role: 'ADMIN' },
  { userId: '01a05f6a-5800-7afc-8e7a-1e9ca63cf5c9', role: 'GUEST' },
  { userId: '01a05f6a-5800-712b-b9c3-f3f31e8e65ab', role: 'MEMBER' },
  { userId: '01a05f6a-5800-716e-8828-74b196e01da9', role: 'MEMBER' },
  { userId: '01a05f6a-5800-784e-bacf-741e5f8b157c', role: 'MEMBER' },
  { userId: '01a05f6a-5800-7d0d-aaef-caa8cdb4ef49', role: 'MEMBER' },
  { userId: '01a05f6a-5800-7613-8249-268b35dc31b9', role: 'MEMBER' },
];

function validateTenantId(id: string | undefined, label: string): string {
  if (!id || !isUUID(id)) {
    throw new Error(`[SEED] ${label} must be a valid UUID`);
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
