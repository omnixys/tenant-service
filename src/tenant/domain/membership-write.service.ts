import { PrismaService } from '../../prisma/prisma.service.js';
import {
  InvalidTenantIdError,
  InvalidUserIdError,
  TenantDisabledError,
  TenantMembershipNotFoundError,
  TenantNotFoundError,
} from '../errors/tenant.error.js';
import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type {
  MembershipRole,
  MembershipStatus,
  TenantMembership,
} from '../../prisma/generated/client.js';

export interface CreateMembershipInput {
  tenantId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdBy: string;
}

export interface CreateMembershipResult {
  membership: TenantMembership;
  created: boolean;
}

export interface UpdateMembershipStatusInput {
  tenantId: string;
  userId: string;
  status: MembershipStatus;
  updatedBy: string;
}

@Injectable()
export class MembershipWriteService {
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

  private async requireActiveTenant(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }
    if (tenant.status !== 'ACTIVE') {
      throw new TenantDisabledError(tenantId, tenant.status);
    }
  }

  /**
   * Idempotent get-or-activate. Creating an existing membership (e.g. guest
   * re-creation or re-invite) reactivates it and clears soft-delete markers.
   */
  async createMembership(input: CreateMembershipInput): Promise<CreateMembershipResult> {
    this.assertTenantId(input.tenantId);
    this.assertUserId(input.userId);
    await this.requireActiveTenant(input.tenantId);

    const existing = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId: input.tenantId, userId: input.userId },
      },
    });

    if (!existing) {
      const membership = await this.prisma.tenantMembership.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          role: input.role,
          status: input.status,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        },
      });
      return { membership, created: true };
    }

    const membership = await this.prisma.tenantMembership.update({
      where: { id: existing.id },
      data: {
        role: input.role,
        status: input.status,
        updatedBy: input.createdBy,
        deletedAt: null,
        deletedBy: null,
      },
    });
    return { membership, created: false };
  }

  async updateMembershipStatus(
    input: UpdateMembershipStatusInput,
  ): Promise<TenantMembership> {
    this.assertTenantId(input.tenantId);
    this.assertUserId(input.userId);

    const existing = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId: input.tenantId, userId: input.userId },
      },
    });
    if (!existing) {
      throw new TenantMembershipNotFoundError(input.tenantId, input.userId);
    }

    return this.prisma.tenantMembership.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        updatedBy: input.updatedBy,
      },
    });
  }

  /**
   * Soft delete: REVOKED status plus deletedAt/deletedBy for full audit.
   */
  async revokeMembership(
    tenantId: string,
    userId: string,
    updatedBy: string,
  ): Promise<TenantMembership> {
    this.assertTenantId(tenantId);
    this.assertUserId(userId);

    const existing = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!existing) {
      throw new TenantMembershipNotFoundError(tenantId, userId);
    }

    return this.prisma.tenantMembership.update({
      where: { id: existing.id },
      data: {
        status: 'REVOKED',
        updatedBy,
        deletedAt: new Date(),
        deletedBy: updatedBy,
      },
    });
  }
}
