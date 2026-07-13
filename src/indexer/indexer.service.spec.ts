import { ConfigService } from '@nestjs/config';
import { PixelPlacedHandler } from '../events/handlers/pixel-placed.handler';
import { StellarService } from '../stellar/stellar.service';
import { IndexerService } from './indexer.service';

// See decode-event.spec.ts for why @stellar/stellar-sdk is mocked rather
// than exercised for real in unit tests.
function fakeScVal(nativeValue: unknown) {
  return { __native: nativeValue };
}

jest.mock('@stellar/stellar-sdk', () => ({
  scValToNative: (scVal: { __native: unknown }) => scVal.__native,
}));

function pixelPlacedEvent(owner: string, x: number, y: number, color: number) {
  return {
    topic: [fakeScVal('pixel_placed'), fakeScVal(owner)],
    value: fakeScVal({ x, y, color }),
  };
}

function otherEvent(name: string) {
  return {
    topic: [fakeScVal(name)],
    value: fakeScVal(1),
  };
}

describe('IndexerService', () => {
  const owner = 'GDH4NEG6TQR4KSOT67KQPHM7OKZUBDJ72DHUW6I24XKQQFK36YECYHCE';
  let getContractEvents: jest.Mock;
  let handle: jest.Mock;
  let service: IndexerService;

  beforeEach(() => {
    getContractEvents = jest.fn();
    handle = jest.fn();

    const stellar = { getContractEvents } as unknown as StellarService;
    const pixelPlacedHandler = { handle } as unknown as PixelPlacedHandler;
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    service = new IndexerService(stellar, pixelPlacedHandler, config);
  });

  it('starts with no cursor, using startLedger mode', async () => {
    getContractEvents.mockResolvedValue({ events: [], cursor: 'cursor-1' });

    await service.pollOnce();

    expect(getContractEvents).toHaveBeenCalledWith({
      startLedger: undefined,
      limit: 100,
    });
  });

  it('resumes from the cursor returned by the previous poll', async () => {
    getContractEvents.mockResolvedValueOnce({ events: [], cursor: 'cursor-1' });
    await service.pollOnce();

    getContractEvents.mockResolvedValueOnce({ events: [], cursor: 'cursor-2' });
    await service.pollOnce();

    expect(getContractEvents).toHaveBeenLastCalledWith({
      cursor: 'cursor-1',
      limit: 100,
    });
  });

  it('dispatches decoded pixel_placed events to the handler', async () => {
    getContractEvents.mockResolvedValue({
      events: [pixelPlacedEvent(owner, 5, 10, 3)],
      cursor: 'cursor-1',
    });

    await service.pollOnce();

    expect(handle).toHaveBeenCalledWith({ owner, x: 5, y: 10, color: 3 });
  });

  it('ignores events with unrecognized names', async () => {
    getContractEvents.mockResolvedValue({
      events: [otherEvent('round_ended')],
      cursor: 'cursor-1',
    });

    await service.pollOnce();

    expect(handle).not.toHaveBeenCalled();
  });

  it('processes multiple events from a single poll in order', async () => {
    getContractEvents.mockResolvedValue({
      events: [
        pixelPlacedEvent(owner, 0, 0, 1),
        pixelPlacedEvent(owner, 1, 1, 2),
      ],
      cursor: 'cursor-1',
    });

    await service.pollOnce();

    expect(handle).toHaveBeenNthCalledWith(1, { owner, x: 0, y: 0, color: 1 });
    expect(handle).toHaveBeenNthCalledWith(2, { owner, x: 1, y: 1, color: 2 });
  });
});
