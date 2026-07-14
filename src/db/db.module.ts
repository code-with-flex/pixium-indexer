import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

/**
 * Global so `PrismaService`/`RedisService` don't need to be re-imported
 * into every feature module that needs DB access. Import `DbModule`
 * once, in `AppModule`.
 */
@Global()
@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService, RedisService],
})
export class DbModule {}
