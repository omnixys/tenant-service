import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@omnixys/logger-ts';
import { BannerService } from './config/banner.service.js';
import { env } from './config/env.js';
import { OmnixysGraphQLModule } from '@omnixys/graphql-ts';
import type { FastifyRequest, FastifyReply } from 'fastify';

const {
  SERVICE,
  LOG_BATCH_ENABLE,
  LOG_BATCH_FLUSH_INTERVAL,
  LOG_BATCH_MAX_SIZE,
  SCHEMA_TARGET,
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
