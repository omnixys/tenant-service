import { env } from '../../config/env.js';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as grpc from '@grpc/grpc-js';
import { createHash, timingSafeEqual } from 'node:crypto';

const WRITE_METHODS = new Set([
  'createMembership',
  'updateMembershipStatus',
  'revokeMembership',
]);

interface GrpcMetadata {
  get(key: string): string[] | string | undefined;
}

interface GrpcCallContext {
  metadata?: GrpcMetadata | null;
  getMetadata?(): GrpcMetadata;
  /** NestJS gRPC exposes the grpc-js Metadata object directly. */
  get?: GrpcMetadata['get'];
}

/**
 * Authenticates gRPC callers via a per-caller bearer token and authorizes
 * the invoked operation against the configured caller allowlists.
 *
 * - Authentication: the presented token is matched (timing-safe) against the
 *   known per-caller tokens (authentication, gateway).
 * - Authorization: write operations (CreateMembership, UpdateMembershipStatus,
 *   RevokeMembership) require a caller in TENANT_GRPC_WRITE_CALLERS; all other
 *   operations require a caller in TENANT_GRPC_READ_CALLERS.
 */
@Injectable()
export class GrpcCallerGuard implements CanActivate {
  private readonly callers: ReadonlyMap<string, string>;

  constructor() {
    this.callers = new Map([
      ['authentication', env.TENANT_GRPC_AUTHENTICATION_TOKEN],
      ['gateway', env.TENANT_GRPC_GATEWAY_TOKEN],
    ]);
  }

  canActivate(context: ExecutionContext): boolean {
    const call = context.switchToRpc().getContext() as GrpcCallContext | undefined;
    const authorization = this.extractAuthorization(call);
    if (!authorization) {
      throw new RpcException({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Missing gRPC caller credentials',
      });
    }

    const caller = this.resolveCaller(authorization);
    if (!caller) {
      throw new RpcException({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Unknown gRPC caller',
      });
    }

    const method = context.getHandler().name;
    const allowed = WRITE_METHODS.has(method)
      ? env.TENANT_GRPC_WRITE_CALLERS
      : env.TENANT_GRPC_READ_CALLERS;

    if (!allowed.includes(caller)) {
      throw new RpcException({
        code: grpc.status.PERMISSION_DENIED,
        message: `Caller '${caller}' is not authorized for operation '${method}'`,
      });
    }

    return true;
  }

  private extractAuthorization(call: GrpcCallContext | undefined): string | undefined {
    let metadata: GrpcMetadata | undefined;
    if (call?.metadata && typeof call.metadata.get === 'function') {
      metadata = call.metadata;
    } else if (typeof call?.get === 'function') {
      metadata = call as unknown as GrpcMetadata;
    } else if (typeof call?.getMetadata === 'function') {
      metadata = call.getMetadata();
    }
    if (!metadata) return undefined;
    const raw = metadata.get('authorization');
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string' || !value.startsWith('Bearer ')) {
      return undefined;
    }
    return value.slice('Bearer '.length).trim();
  }

  private resolveCaller(token: string): string | undefined {
    for (const [caller, expected] of this.callers) {
      if (this.secureEqual(token, expected)) {
        return caller;
      }
    }
    return undefined;
  }

  private secureEqual(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
