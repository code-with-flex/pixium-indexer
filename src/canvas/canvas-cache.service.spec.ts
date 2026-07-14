import { RedisService } from '../db/redis.service';
import { CanvasCacheService } from './canvas-cache.service';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLOR_BITS } from './canvas.constants';

describe('CanvasCacheService', () => {
  let exists: jest.Mock;
  let set: jest.Mock;
  let bitfield: jest.Mock;
  let service: CanvasCacheService;

  beforeEach(() => {
    exists = jest.fn();
    set = jest.fn().mockResolvedValue('OK');
    bitfield = jest.fn().mockResolvedValue([0]);

    const redis = {
      client: { exists, set, bitfield },
    } as unknown as RedisService;

    service = new CanvasCacheService(redis);
  });

  describe('ensureCanvasInitialized', () => {
    it('does nothing if the canvas key already exists', async () => {
      exists.mockResolvedValue(1);

      await service.ensureCanvasInitialized();

      expect(set).not.toHaveBeenCalled();
    });

    it('creates a zero-filled buffer sized for the full canvas if missing', async () => {
      exists.mockResolvedValue(0);

      await service.ensureCanvasInitialized();

      const expectedBytes = Math.ceil(
        (CANVAS_WIDTH * CANVAS_HEIGHT * COLOR_BITS) / 8,
      );
      expect(set).toHaveBeenCalledTimes(1);
      const [key, buffer] = set.mock.calls[0] as [string, Buffer];
      expect(key).toBe('canvas');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(expectedBytes);
      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });
  });

  describe('setPixel', () => {
    it('computes the correct bit offset for a given (x, y)', async () => {
      await service.setPixel(5, 2, 7);

      const position = 2 * CANVAS_WIDTH + 5;
      const expectedOffset = position * COLOR_BITS;
      expect(bitfield).toHaveBeenCalledWith(
        'canvas',
        'SET',
        `u${COLOR_BITS}`,
        expectedOffset,
        7,
      );
    });

    it('computes offset 0 for the top-left pixel', async () => {
      await service.setPixel(0, 0, 3);

      expect(bitfield).toHaveBeenCalledWith(
        'canvas',
        'SET',
        `u${COLOR_BITS}`,
        0,
        3,
      );
    });
  });
});
