import { CanvasCacheService } from '../../canvas/canvas-cache.service';
import { PixelPlacedHandler } from './pixel-placed.handler';

describe('PixelPlacedHandler', () => {
  it('writes the pixel to the canvas cache', async () => {
    const setPixel = jest.fn().mockResolvedValue(undefined);
    const canvasCache = { setPixel } as unknown as CanvasCacheService;
    const handler = new PixelPlacedHandler(canvasCache);

    await handler.handle({
      owner: 'GDH4NEG6TQR4KSOT67KQPHM7OKZUBDJ72DHUW6I24XKQQFK36YECYHCE',
      x: 5,
      y: 10,
      color: 3,
    });

    expect(setPixel).toHaveBeenCalledWith(5, 10, 3);
  });
});
