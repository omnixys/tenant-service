import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  TenantDomainError,
  InvalidTenantIdError,
  InvalidUserIdError,
  TenantNotFoundError,
  TenantDisabledError,
  TenantMembershipNotFoundError,
  TenantMembershipInactiveError,
  TenantMembershipDeniedError,
  TenantAlreadyExistsError,
  TenantNameEmptyError,
  TenantSlugEmptyError,
  TenantSlugExistsError,
  toGrpcException,
} = await import('../src/tenant/errors/tenant.error.js');

describe('TenantDomainError', () => {
  it('carries code, message and metadata', () => {
    const err = new TenantDomainError('TEST_CODE', 'test message', {
      metadata: { foo: 'bar' },
    });
    assert.equal(err.code, 'TEST_CODE');
    assert.equal(err.message, 'test message');
    assert.equal(err.metadata.foo, 'bar');
    assert.equal(err.name, 'TenantDomainError');
    assert.ok(err instanceof Error);
  });

  it('defaults metadata to empty object', () => {
    const err = new TenantDomainError('X', 'y');
    assert.deepEqual(err.metadata, {});
  });
});

describe('InvalidTenantIdError', () => {
  it('uses INVALID_TENANT_ID code and includes tenantId', () => {
    const err = new InvalidTenantIdError('abc');
    assert.equal(err.code, 'INVALID_TENANT_ID');
    assert.ok(err.message.includes('abc'));
    assert.equal(err.metadata.tenantId, 'abc');
  });
});

describe('InvalidUserIdError', () => {
  it('uses INVALID_USER_ID code and includes userId', () => {
    const err = new InvalidUserIdError('u1');
    assert.equal(err.code, 'INVALID_USER_ID');
    assert.equal(err.metadata.userId, 'u1');
  });
});

describe('TenantNotFoundError', () => {
  it('uses TENANT_NOT_FOUND code', () => {
    const err = new TenantNotFoundError('t1');
    assert.equal(err.code, 'TENANT_NOT_FOUND');
    assert.equal(err.metadata.tenantId, 't1');
  });
});

describe('TenantAlreadyExistsError', () => {
  it('uses TENANT_ALREADY_EXISTS code', () => {
    const err = new TenantAlreadyExistsError('my-org');
    assert.equal(err.code, 'TENANT_ALREADY_EXISTS');
    assert.equal(err.metadata.slug, 'my-org');
  });
});

describe('TenantSlugExistsError', () => {
  it('uses TENANT_SLUG_EXISTS code', () => {
    const err = new TenantSlugExistsError('slug');
    assert.equal(err.code, 'TENANT_SLUG_EXISTS');
  });
});

describe('TenantNameEmptyError', () => {
  it('uses TENANT_NAME_EMPTY code', () => {
    const err = new TenantNameEmptyError();
    assert.equal(err.code, 'TENANT_NAME_EMPTY');
  });
});

describe('TenantSlugEmptyError', () => {
  it('uses TENANT_SLUG_EMPTY code', () => {
    const err = new TenantSlugEmptyError();
    assert.equal(err.code, 'TENANT_SLUG_EMPTY');
  });
});

describe('TenantDisabledError', () => {
  it('uses TENANT_DISABLED code and includes status', () => {
    const err = new TenantDisabledError('t1', 'suspended');
    assert.equal(err.code, 'TENANT_DISABLED');
    assert.equal(err.metadata.status, 'suspended');
  });
});

describe('TenantMembershipNotFoundError', () => {
  it('uses TENANT_MEMBERSHIP_NOT_FOUND code', () => {
    const err = new TenantMembershipNotFoundError('t1', 'u1');
    assert.equal(err.code, 'TENANT_MEMBERSHIP_NOT_FOUND');
    assert.equal(err.metadata.tenantId, 't1');
    assert.equal(err.metadata.userId, 'u1');
  });
});

describe('TenantMembershipInactiveError', () => {
  it('uses TENANT_MEMBERSHIP_INACTIVE code and includes status', () => {
    const err = new TenantMembershipInactiveError('t1', 'u1', 'expired');
    assert.equal(err.code, 'TENANT_MEMBERSHIP_INACTIVE');
    assert.equal(err.metadata.status, 'expired');
  });
});

describe('TenantMembershipDeniedError', () => {
  it('uses TENANT_MEMBERSHIP_DENIED code', () => {
    const err = new TenantMembershipDeniedError('t1', 'u1');
    assert.equal(err.code, 'TENANT_MEMBERSHIP_DENIED');
  });
});

describe('toGrpcException', () => {
  const grpcCodes = {
    INVALID_ARGUMENT: 3,
    NOT_FOUND: 5,
    ALREADY_EXISTS: 6,
    FAILED_PRECONDITION: 9,
    PERMISSION_DENIED: 7,
  };

  it('maps INVALID_TENANT_ID to INVALID_ARGUMENT', () => {
    const ex = toGrpcException(new InvalidTenantIdError('x'));
    const status = ex.getError().code;
    assert.equal(status, grpcCodes.INVALID_ARGUMENT);
  });

  it('maps TENANT_NOT_FOUND to NOT_FOUND', () => {
    const ex = toGrpcException(new TenantNotFoundError('x'));
    assert.equal(ex.getError().code, grpcCodes.NOT_FOUND);
  });

  it('maps TENANT_ALREADY_EXISTS to ALREADY_EXISTS', () => {
    const ex = toGrpcException(new TenantAlreadyExistsError('x'));
    assert.equal(ex.getError().code, grpcCodes.ALREADY_EXISTS);
  });

  it('maps TENANT_DISABLED to FAILED_PRECONDITION', () => {
    const ex = toGrpcException(new TenantDisabledError('x', 'off'));
    assert.equal(ex.getError().code, grpcCodes.FAILED_PRECONDITION);
  });

  it('maps TENANT_MEMBERSHIP_DENIED to PERMISSION_DENIED', () => {
    const ex = toGrpcException(new TenantMembershipDeniedError('t', 'u'));
    assert.equal(ex.getError().code, grpcCodes.PERMISSION_DENIED);
  });

  it('includes details JSON with error code and metadata', () => {
    const ex = toGrpcException(new InvalidTenantIdError('tid'));
    const details = JSON.parse(ex.getError().details);
    assert.equal(details.code, 'INVALID_TENANT_ID');
    assert.equal(details.tenantId, 'tid');
  });
});
