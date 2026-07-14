import { Module } from '@nestjs/common';
import { CanvasCacheService } from './canvas-cache.service';

@Module({
  providers: [CanvasCacheService],
  exports: [CanvasCacheService],
})
export class CanvasModule {}
