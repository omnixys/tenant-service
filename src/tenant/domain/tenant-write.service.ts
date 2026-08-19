import type { Tenant, TenantStatus } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  InvalidTenantIdError,
  TenantNameEmptyError,
  TenantNotFoundError,
  TenantSlugEmptyError,
  TenantSlugExistsError,
} from '../errors/tenant.error.js';
import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';

export interface CreateTenantInput {
  name: string;
  slug: string;
  createdBy: string;
}

export interface UpdateTenantInput {
  id: string;
  name?: string;
  slug?: string;
  status?: TenantStatus;
  updatedBy: string;
}

export interface DeleteTenantInput {
  id: string;
  updatedBy: string;
}

export interface ListTenantsInput {
  status?: TenantStatus;
}

@Injectable()
export class TenantWriteService {
  constructor(private readonly prisma: PrismaService) {}

  private assertTenantId(tenantId: string): void {
    if (!isUUID(tenantId, '4')) {
      throw new InvalidTenantIdError(tenantId);
    }
  }

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    if (!input.name?.trim()) {
      throw new TenantNameEmptyError();
    }

    if (!input.slug?.trim()) {
      throw new TenantSlugEmptyError();
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new TenantSlugExistsError(input.slug);
    }

    return this.prisma.tenant.create({
      data: {
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
      },
    });
  }

  async updateTenant(input: UpdateTenantInput): Promise<Tenant> {
    this.assertTenantId(input.id);

    const existing = await this.prisma.tenant.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new TenantNotFoundError(input.id);
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new TenantNameEmptyError();
      }
      data.name = input.name.trim();
    }

    if (input.slug !== undefined) {
      if (!input.slug.trim()) {
        throw new TenantSlugEmptyError();
      }
      const slugConflict = await this.prisma.tenant.findFirst({
        where: {
          slug: input.slug.trim().toLowerCase(),
          id: { not: input.id },
        },
      });

      if (slugConflict) {
        throw new TenantSlugExistsError(input.slug);
      }

      data.slug = input.slug.trim().toLowerCase();
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    return this.prisma.tenant.update({
      where: { id: input.id },
      data,
    });
  }

  async deleteTenant(input: DeleteTenantInput): Promise<boolean> {
    this.assertTenantId(input.id);

    const existing = await this.prisma.tenant.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new TenantNotFoundError(input.id);
    }

    await this.prisma.tenant.update({
      where: { id: input.id },
      data: { status: 'ARCHIVED' },
    });

    return true;
  }

  async listTenants(input: ListTenantsInput): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      where: input.status ? { status: input.status } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }
}
