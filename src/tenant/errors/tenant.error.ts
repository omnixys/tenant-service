import * as grpc from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

export interface TenantErrorOptions {
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Base domain error of the tenant service. Every error carries a canonical
 * event code that downstream services and the gateway map to HTTP responses.
 */
export class TenantDomainError extends Error {
  readonly code: string;
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, options: TenantErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = options.metadata ?? {};
  }
}

export class InvalidTenantIdError extends TenantDomainError {
  constructor(tenantId: string) {
    super('INVALID_TENANT_ID', `Tenant id is not a valid UUID: ${tenantId}`, {
      metadata: { tenantId },
    });
  }
}

export class InvalidUserIdError extends TenantDomainError {
  constructor(userId: string) {
    super('INVALID_USER_ID', `User id is not a valid UUID: ${userId}`, {
      metadata: { userId },
    });
  }
}

export class TenantNotFoundError extends TenantDomainError {
  constructor(tenantId: string) {
    super('TENANT_NOT_FOUND', `Tenant does not exist: ${tenantId}`, {
      metadata: { tenantId },
    });
  }
}

export class TenantDisabledError extends TenantDomainError {
  constructor(tenantId: string, status: string) {
    super('TENANT_DISABLED', `Tenant is not active (${status}): ${tenantId}`, {
      metadata: { tenantId, status },
    });
  }
}

export class TenantMembershipNotFoundError extends TenantDomainError {
  constructor(tenantId: string, userId: string) {
    super('TENANT_MEMBERSHIP_NOT_FOUND', `No membership for user in tenant`, {
      metadata: { tenantId, userId },
    });
  }
}

export class TenantMembershipInactiveError extends TenantDomainError {
  constructor(tenantId: string, userId: string, status: string) {
    super(
      'TENANT_MEMBERSHIP_INACTIVE',
      `Membership is not active (${status}) for user in tenant`,
      { metadata: { tenantId, userId, status } },
    );
  }
}

export class TenantMembershipDeniedError extends TenantDomainError {
  constructor(tenantId: string, userId: string) {
    super(
      'TENANT_MEMBERSHIP_DENIED',
      `User has no active membership in tenant`,
      { metadata: { tenantId, userId } },
    );
  }
}

export class TenantAlreadyExistsError extends TenantDomainError {
  constructor(slug: string) {
    super('TENANT_ALREADY_EXISTS', `Tenant with slug already exists: ${slug}`, {
      metadata: { slug },
    });
  }
}

export class TenantNameEmptyError extends TenantDomainError {
  constructor() {
    super('TENANT_NAME_EMPTY', 'Tenant name must not be empty', {});
  }
}

export class TenantSlugEmptyError extends TenantDomainError {
  constructor() {
    super('TENANT_SLUG_EMPTY', 'Tenant slug must not be empty', {});
  }
}

export class TenantSlugExistsError extends TenantDomainError {
  constructor(slug: string) {
    super('TENANT_SLUG_EXISTS', `Tenant slug already exists: ${slug}`, {
      metadata: { slug },
    });
  }
}

/**
 * Maps a canonical tenant error to a gRPC exception. The mapping is stable
 * and shared with the gateway/HTTP layer via the canonical event code.
 */
export function toGrpcException(error: TenantDomainError): RpcException {
  let code: number;
  switch (error.code) {
    case 'INVALID_TENANT_ID':
    case 'INVALID_USER_ID':
    case 'TENANT_NAME_EMPTY':
    case 'TENANT_SLUG_EMPTY':
      code = grpc.status.INVALID_ARGUMENT;
      break;
    case 'TENANT_NOT_FOUND':
      code = grpc.status.NOT_FOUND;
      break;
    case 'TENANT_ALREADY_EXISTS':
    case 'TENANT_SLUG_EXISTS':
      code = grpc.status.ALREADY_EXISTS;
      break;
    case 'TENANT_DISABLED':
    case 'TENANT_MEMBERSHIP_INACTIVE':
      code = grpc.status.FAILED_PRECONDITION;
      break;
    case 'TENANT_MEMBERSHIP_NOT_FOUND':
    case 'TENANT_MEMBERSHIP_DENIED':
    default:
      code = grpc.status.PERMISSION_DENIED;
      break;
  }
  return new RpcException({
    code,
    message: error.message,
    details: JSON.stringify({ code: error.code, ...error.metadata }),
  });
}
