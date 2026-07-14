import { Injectable, Logger } from '@nestjs/common';
import { CanvasCacheService } from '../../canvas/canvas-cache.service';

export interface PixelPlacedEvent {
  owner: string;
  x: number;
  y: number;
  color: number;
}

/**
 * Handles decoded `pixel_placed` events from the canvas contract.
 *
 * Updates the Redis canvas cache so the backend can serve fast reads.
 * Writing a persistent history record to Postgres (for leaderboards,
 * audit trail, etc.) is a separate follow-up slice.
 */
@Injectable()
export class PixelPlacedHandler {
  private readonly logger = new Logger(PixelPlacedHandler.name);

  constructor(private readonly canvasCache: CanvasCacheService) {}

  async handle(event: PixelPlacedEvent): Promise<void> {
    await this.canvasCache.setPixel(event.x, event.y, event.color);

    this.logger.log(
      `pixel placed: (${event.x}, ${event.y}) color=${event.color} owner=${event.owner}`,
    );
  }
}
