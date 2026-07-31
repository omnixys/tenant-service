import { GrpcCallerGuard } from './grpc/grpc-caller.guard.js';
import { MembershipWriteService } from './domain/membership-write.service.js';
import { TenantReadService } from './domain/tenant-read.service.js';
import { TenantController } from './grpc/tenant.controller.js';
import { Module } from '@nestjs/common';

@Module({
  controllers: [TenantController],
  providers: [
    TenantReadService,
    MembershipWriteService,
    GrpcCallerGuard,
  ],
  exports: [TenantReadService, MembershipWriteService],
})
export class TenantModule {}
