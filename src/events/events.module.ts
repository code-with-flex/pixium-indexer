import { Module } from '@nestjs/common';
import { PixelPlacedHandler } from './handlers/pixel-placed.handler';

@Module({
  providers: [PixelPlacedHandler],
  exports: [PixelPlacedHandler],
})
export class EventsModule {}
