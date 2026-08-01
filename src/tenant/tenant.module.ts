import { GrpcCallerGuard } from './grpc/grpc-caller.guard.js';
import { MembershipWriteService } from './domain/membership-write.service.js';
import { TenantReadService } from './domain/tenant-read.service.js';
import { TenantWriteService } from './domain/tenant-write.service.js';
import { TenantController } from './grpc/tenant.controller.js';
import { Module } from '@nestjs/common';

@Module({
  controllers: [TenantController],
  providers: [
    TenantReadService,
    TenantWriteService,
    MembershipWriteService,
    GrpcCallerGuard,
  ],
  exports: [TenantReadService, TenantWriteService, MembershipWriteService],
})
export class TenantModule {}
