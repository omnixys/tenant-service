import {
  MembershipWriteService,
} from '../domain/membership-write.service.js';
import { TenantReadService } from '../domain/tenant-read.service.js';
import { GrpcCallerGuard } from './grpc-caller.guard.js';
import {
  TenantDomainError,
  toGrpcException,
} from '../errors/tenant.error.js';
import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import * as grpc from '@grpc/grpc-js';
import type {
  MembershipRole,
  MembershipStatus,
  Tenant,
  TenantMembership,
} from '../../prisma/generated/client.js';

const MEMBERSHIP_ROLES = new Set(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']);
const MEMBERSHIP_STATUSES = new Set([
  'ACTIVE',
  'INVITED',
  'SUSPENDED',
  'REVOKED',
]);

function requireRole(value: string): MembershipRole {
  if (!MEMBERSHIP_ROLES.has(value)) {
    throw new RpcException({
      code: grpc.status.INVALID_ARGUMENT,
      message: `Invalid membership role: ${value}`,
    });
  }
  return value as MembershipRole;
}

function requireMembershipStatus(value: string): MembershipStatus {
  if (!MEMBERSHIP_STATUSES.has(value)) {
    throw new RpcException({
      code: grpc.status.INVALID_ARGUMENT,
      message: `Invalid membership status: ${value}`,
    });
  }
  return value as MembershipStatus;
}

function toTenantProto(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

function toMembershipProto(membership: TenantMembership) {
  return {
    tenantId: membership.tenantId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    createdBy: membership.createdBy,
    createdAt: membership.createdAt.toISOString(),
    updatedBy: membership.updatedBy,
    updatedAt: membership.updatedAt.toISOString(),
    deletedBy: membership.deletedBy ?? undefined,
    deletedAt: membership.deletedAt?.toISOString() ?? undefined,
  };
}

@Controller()
@UseGuards(GrpcCallerGuard)
export class TenantController {
  constructor(
    private readonly tenantRead: TenantReadService,
    private readonly membershipWrite: MembershipWriteService,
  ) {}

  @GrpcMethod('TenantService', 'GetTenant')
  async getTenant(data: { id: string }) {
    try {
      const tenant = await this.tenantRead.getTenant(data.id);
      return { tenant: toTenantProto(tenant) };
    } catch (error) {
      this.throwRpc(error);
    }
  }

  @GrpcMethod('TenantService', 'ValidateMembership')
  async validateMembership(data: { tenantId: string; userId: string }) {
    try {
      const result = await this.tenantRead.validateMembership(
        data.tenantId,
        data.userId,
      );
      return {
        tenantExists: result.tenantExists,
        tenantActive: result.tenantActive,
        membershipExists: result.membershipExists,
        membershipActive: result.membershipActive,
        role: result.role ?? 'MEMBERSHIP_ROLE_UNSPECIFIED',
        reason: result.reason,
      };
    } catch (error) {
      this.throwRpc(error);
    }
  }

  @GrpcMethod('TenantService', 'ListUserTenants')
  async listUserTenants(data: { userId: string }) {
    try {
      const memberships = await this.tenantRead.listUserTenants(data.userId);
      return {
        memberships: memberships.map((membership) =>
          toMembershipProto(membership),
        ),
      };
    } catch (error) {
      this.throwRpc(error);
    }
  }

  @GrpcMethod('TenantService', 'CreateMembership')
  async createMembership(
    data: {
      tenantId: string;
      userId: string;
      role: string;
      status: string;
      createdBy: string;
    },
  ) {
    try {
      const { membership, created } =
        await this.membershipWrite.createMembership({
          tenantId: data.tenantId,
          userId: data.userId,
          role: requireRole(data.role),
          status: requireMembershipStatus(data.status),
          createdBy: data.createdBy,
        });
      return {
        membership: toMembershipProto(membership),
        created,
      };
    } catch (error) {
      this.throwRpc(error);
    }
  }

  @GrpcMethod('TenantService', 'UpdateMembershipStatus')
  async updateMembershipStatus(
    data: {
      tenantId: string;
      userId: string;
      status: string;
      updatedBy: string;
    },
  ) {
    try {
      const membership = await this.membershipWrite.updateMembershipStatus({
        tenantId: data.tenantId,
        userId: data.userId,
        status: requireMembershipStatus(data.status),
        updatedBy: data.updatedBy,
      });
      return { membership: toMembershipProto(membership) };
    } catch (error) {
      this.throwRpc(error);
    }
  }

  @GrpcMethod('TenantService', 'RevokeMembership')
  async revokeMembership(
    data: { tenantId: string; userId: string; updatedBy: string },
  ) {
    try {
      const membership = await this.membershipWrite.revokeMembership(
        data.tenantId,
        data.userId,
        data.updatedBy,
      );
      return { membership: toMembershipProto(membership) };
    } catch (error) {
      this.throwRpc(error);
    }
  }

  private throwRpc(error: unknown): never {
    if (error instanceof TenantDomainError) {
      throw toGrpcException(error);
    }
    throw error;
  }
}
