import { Injectable, Logger } from '@nestjs/common';

export interface PixelPlacedEvent {
  owner: string;
  x: number;
  y: number;
  color: number;
}

/**
 * Handles decoded `pixel_placed` events from the canvas contract.
 *
 * For now this just logs — writing to Postgres (persistent record) and
 * Redis (canvas state cache) is a separate follow-up slice once DB
 * clients are wired up.
 */
@Injectable()
export class PixelPlacedHandler {
  private readonly logger = new Logger(PixelPlacedHandler.name);

  handle(event: PixelPlacedEvent): void {
    this.logger.log(
      `pixel placed: (${event.x}, ${event.y}) color=${event.color} owner=${event.owner}`,
    );
  }
}
