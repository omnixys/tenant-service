import { AppModule } from './app.module.js';
import { env } from './config/env.js';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { createGrpcServerOptions } from '@omnixys/grpc-ts/servers';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { registerFastifyTracing } from '@omnixys/observability-ts';
import { fileURLToPath } from 'node:url';
import 'reflect-metadata';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
    }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  registerFastifyTracing(fastify);
  const logger = app.get(OmnixysLogger).log('Bootstrap');

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  });

  await app.register(compress, {
    global: true,
    encodings: ['br', 'gzip', 'deflate'],
    threshold: 1024,
  });

  app.enableShutdownHooks();

  app.connectMicroservice(
    createGrpcServerOptions({
      package: 'omnixys.tenant',
      protoPath: fileURLToPath(
        import.meta.resolve('@omnixys/grpc-ts/proto/tenant.proto'),
      ),
      url: `${env.GRPC_HOST}:${env.GRPC_PORT}`,
    }),
  );
  await app.startAllMicroservices();

  await app.listen(env.PORT, '0.0.0.0');

  logger.info('Service started', {
    service: env.SERVICE,
    port: env.PORT,
    grpc: env.GRPC_PORT,
  });
}

void bootstrap();
