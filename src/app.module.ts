import { BannerService } from './config/banner.service.js';
import { env } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { Module } from '@nestjs/common';
import { OmnixysGraphQLModule } from '@omnixys/graphql-ts';
import { LoggerModule } from '@omnixys/logger-ts';
import { ObservabilityModule } from '@omnixys/observability-ts';
import type { FastifyRequest, FastifyReply } from 'fastify';

const {
  SERVICE,
  LOG_BATCH_ENABLE,
  LOG_BATCH_FLUSH_INTERVAL,
  LOG_BATCH_MAX_SIZE,
  SCHEMA_TARGET,
  OTEL_LOGS_ENABLED,
  OTEL_URI,
  OTEL_TRANSPORT_MODE,
  OTEL_SAMPLING_RATIO,
  PROMETHEUS_ENABLE,
  PROMETHEUS_PORT,
} = env;

@Module({
  imports: [
    OmnixysGraphQLModule.forRoot({
      context: ({ req, reply }: { req: FastifyRequest; reply: FastifyReply }) => ({
        req,
        reply,
      }),
      autoSchemaFile:
        SCHEMA_TARGET === 'tmp'
          ? { path: '/tmp/schema.gql', federation: 2 }
          : SCHEMA_TARGET === 'false'
            ? false
            : { path: 'dist/schema.gql', federation: 2 },
    }),
    ObservabilityModule.forRoot({
      serviceName: SERVICE,
      otel: {
        endpoint: OTEL_URI,
        transport: OTEL_TRANSPORT_MODE as 'http' | 'grpc',
        samplingRatio: OTEL_SAMPLING_RATIO,
      },
      logs: {
        enabled: OTEL_LOGS_ENABLED,
      },
      metrics: {
        port: PROMETHEUS_PORT,
        enabled: PROMETHEUS_ENABLE,
      },
    }),
    LoggerModule.forRoot({
      serviceName: SERVICE,
      registerGlobalInterceptor: true,
      batch: {
        enabled: LOG_BATCH_ENABLE,
        maxSize: LOG_BATCH_MAX_SIZE,
        flushInterval: LOG_BATCH_FLUSH_INTERVAL,
      },
    }),
    PrismaModule,
    HealthModule,
    TenantModule,
  ],
  providers: [BannerService],
})
export class AppModule {}
