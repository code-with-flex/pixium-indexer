import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../db/redis.service';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLOR_BITS } from './canvas.constants';

/**
 * Single Redis key holding the entire canvas as a bit-packed byte
 * array — one value per pixel, `COLOR_BITS` bits wide, written via
 * `BITFIELD SET`. Matches art/peace's approach (a single STRING key
 * per canvas, no per-pixel keys) so the backend can read the whole
 * canvas with one `GET`.
 */
const CANVAS_KEY = 'canvas';

/**
 * Maintains the compressed canvas byte array in Redis. The indexer only
 * writes to it — serving canvas reads to the frontend is the backend's
 * job (it reads this same key directly).
 */
@Injectable()
export class CanvasCacheService implements OnModuleInit {
  private readonly logger = new Logger(CanvasCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCanvasInitialized();
  }

  /** Creates the canvas key, zero-filled, if it doesn't already exist. */
  async ensureCanvasInitialized(): Promise<void> {
    const exists = await this.redis.client.exists(CANVAS_KEY);
    if (exists) {
      return;
    }

    const totalBits = CANVAS_WIDTH * CANVAS_HEIGHT * COLOR_BITS;
    const totalBytes = Math.ceil(totalBits / 8);
    await this.redis.client.set(CANVAS_KEY, Buffer.alloc(totalBytes));
    this.logger.log(`Initialized canvas key (${totalBytes} bytes)`);
  }

  /** Writes a single pixel's color into the packed canvas byte array. */
  async setPixel(x: number, y: number, color: number): Promise<void> {
    const position = y * CANVAS_WIDTH + x;
    const bitOffset = position * COLOR_BITS;

    await this.redis.client.bitfield(
      CANVAS_KEY,
      'SET',
      `u${COLOR_BITS}`,
      bitOffset,
      color,
    );
  }
}
