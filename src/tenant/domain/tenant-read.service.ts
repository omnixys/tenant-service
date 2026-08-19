import type { Tenant, TenantMembership } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  InvalidTenantIdError,
  InvalidUserIdError,
  TenantNotFoundError,
} from '../errors/tenant.error.js';
import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';

export interface ValidateMembershipResult {
  tenantExists: boolean;
  tenantActive: boolean;
  membershipExists: boolean;
  membershipActive: boolean;
  role: TenantMembership['role'] | null;
  reason: string;
}

@Injectable()
export class TenantReadService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenantId(tenantId: string): void {
    if (!isUUID(tenantId, '4')) {
      throw new InvalidTenantIdError(tenantId);
    }
  }

  private assertUserId(userId: string): void {
    if (!isUUID(userId, '4')) {
      throw new InvalidUserIdError(userId);
    }
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    this.assertTenantId(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }
    return tenant;
  }

  /**
   * Returns a non-throwing validation result. Used by callers to decide
   * between allow/deny/selection. Only structurally invalid inputs throw.
   */
  async validateMembership(tenantId: string, userId: string): Promise<ValidateMembershipResult> {
    this.assertTenantId(tenantId);
    this.assertUserId(userId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return {
        tenantExists: false,
        tenantActive: false,
        membershipExists: false,
        membershipActive: false,
        role: null,
        reason: 'TENANT_NOT_FOUND',
      };
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    return {
      tenantExists: true,
      tenantActive: tenant.status === 'ACTIVE',
      membershipExists: Boolean(membership),
      membershipActive: Boolean(membership) && membership?.status === 'ACTIVE',
      role: membership?.role ?? null,
      reason: !membership
        ? 'TENANT_MEMBERSHIP_NOT_FOUND'
        : tenant.status !== 'ACTIVE'
          ? 'TENANT_DISABLED'
          : membership.status !== 'ACTIVE'
            ? 'TENANT_MEMBERSHIP_INACTIVE'
            : 'OK',
    };
  }

  /**
   * Effective active memberships: ACTIVE status in ACTIVE tenants.
   * This directly serves tenant selection (login) and the frontend
   * tenant list. Inactive/revoked memberships are intentionally excluded.
   */
  async listUserTenants(userId: string): Promise<TenantMembership[]> {
    this.assertUserId(userId);
    return this.prisma.tenantMembership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        tenant: { status: 'ACTIVE' },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
