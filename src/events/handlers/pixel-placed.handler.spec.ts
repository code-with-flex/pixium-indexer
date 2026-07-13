import { PixelPlacedHandler } from './pixel-placed.handler';

describe('PixelPlacedHandler', () => {
  it('handles an event without throwing', () => {
    const handler = new PixelPlacedHandler();

    expect(() =>
      handler.handle({
        owner: 'GDH4NEG6TQR4KSOT67KQPHM7OKZUBDJ72DHUW6I24XKQQFK36YECYHCE',
        x: 5,
        y: 10,
        color: 3,
      }),
    ).not.toThrow();
  });
});
