import { PrismaService } from '../prisma/prisma.service.js';
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  type HealthIndicatorFunction,
  type HealthIndicatorResult,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  readonly #health: HealthCheckService;
  readonly #prisma: PrismaService;

  constructor(health: HealthCheckService, prisma: PrismaService) {
    this.#health = health;
    this.#prisma = prisma;
  }

  @Get('liveness')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.#health.check([
      () => Promise.resolve({ app: { status: 'up' } }),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    const checks: HealthIndicatorFunction[] = [
      () => Promise.resolve({ app: { status: 'up' } }),
      () => this.databaseHealth(),
    ];
    return this.#health.check(checks);
  }

  private async databaseHealth(): Promise<HealthIndicatorResult> {
    await this.#prisma.$queryRaw`SELECT 1`;
    return { database: { status: 'up' } };
  }
}
