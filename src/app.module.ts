import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@omnixys/logger-ts';
import { BannerService } from './config/banner.service.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      serviceName: 'tenant',
      registerGlobalInterceptor: true,
      batch: {
        enabled: true,
        maxSize: 50,
        flushInterval: 2000,
      },
    }),
    PrismaModule,
    HealthModule,
    TenantModule,
  ],
    providers: [BannerService],
})
export class AppModule {}
