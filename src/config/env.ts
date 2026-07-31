import 'dotenv/config';
import process from 'node:process';
import { isUUID } from 'class-validator';

function requiredTenantId(): string {
  const value = process.env.DEFAULT_TENANT_ID;
  if (!value || !isUUID(value, '4')) {
    throw new Error('[ENV] DEFAULT_TENANT_ID must be a valid UUID v4');
  }
  return value;
}

function requiredUrl(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[ENV] ${name} is required`);
  }
  return value;
}

function splitCallers(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  SERVICE: process.env.SERVICE ?? 'tenant',
  PORT: Number(process.env.PORT ?? 3000),

  /** Canonical bootstrap tenant id. Only used for seeding; never a runtime fallback. */
  DEFAULT_TENANT_ID: requiredTenantId(),

  /** Logging */
  LOG_DEFAULT: process.env.LOG_DEFAULT === 'true',
  LOG_DIRECTORY: process.env.LOG_DIRECTORY ?? 'log',
  LOG_FILE_DEFAULT_NAME: process.env.LOG_FILE_DEFAULT_NAME ?? 'server.log',
  LOG_PRETTY: process.env.LOG_PRETTY === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',

  /** HTTPS */
  HTTPS: process.env.HTTPS === 'true',
  KEYS_PATH: process.env.KEYS_PATH ?? './keys',

  /** Tracing */
  TEMPO_URI:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    process.env.TEMPO_URI ??
    'http://localhost:4318',

  /** Health endpoints */
  TEMPO_HEALTH_URL: process.env.TEMPO_HEALTH_URL ?? '',
  PROMETHEUS_HEALTH_URL: process.env.PROMETHEUS_HEALTH_URL ?? '',

  /** Database */
  DATABASE_URL: requiredUrl('DATABASE_URL'),

  /** gRPC server */
  GRPC_HOST: process.env.GRPC_HOST ?? '0.0.0.0',
  GRPC_PORT: Number(process.env.GRPC_PORT ?? 50052),

  /** Per-caller service tokens for gRPC caller authentication. */
  TENANT_GRPC_AUTHENTICATION_TOKEN:
    process.env.TENANT_GRPC_AUTHENTICATION_TOKEN ?? 'dev-authentication-service-token',
  TENANT_GRPC_GATEWAY_TOKEN:
    process.env.TENANT_GRPC_GATEWAY_TOKEN ?? 'dev-gateway-service-token',

  /** Authorized callers per operation group. */
  TENANT_GRPC_READ_CALLERS: splitCallers(process.env.TENANT_GRPC_READ_CALLERS).length
    ? splitCallers(process.env.TENANT_GRPC_READ_CALLERS)
    : ['authentication', 'gateway'],
  TENANT_GRPC_WRITE_CALLERS: splitCallers(process.env.TENANT_GRPC_WRITE_CALLERS).length
    ? splitCallers(process.env.TENANT_GRPC_WRITE_CALLERS)
    : ['authentication'],
} as const;
