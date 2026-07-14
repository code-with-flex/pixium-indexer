import { Module } from '@nestjs/common';
import { CanvasModule } from '../canvas/canvas.module';
import { PixelPlacedHandler } from './handlers/pixel-placed.handler';

@Module({
  imports: [CanvasModule],
  providers: [PixelPlacedHandler],
  exports: [PixelPlacedHandler],
})
export class EventsModule {}
