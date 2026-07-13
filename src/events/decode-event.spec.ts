import { decodeEvent } from './decode-event';

// Mocked here (rather than exercising the real SDK) because
// @stellar/stellar-sdk's root index eagerly loads unrelated submodules
// (federation, webauth) that pull in ESM-only transitive dependencies
// Jest can't parse out of the box. decodeEvent's own logic — splitting
// the name out of the topics — doesn't depend on real XDR encoding, so a
// stand-in for scValToNative is enough to test it in isolation. (jest.mock
// calls are hoisted above imports by Jest regardless of source order.)
function fakeScVal(nativeValue: unknown) {
  return { __native: nativeValue };
}

jest.mock('@stellar/stellar-sdk', () => ({
  scValToNative: (scVal: { __native: unknown }) => scVal.__native,
}));

describe('decodeEvent', () => {
  it('splits the first topic out as the event name', () => {
    const owner = 'GDH4NEG6TQR4KSOT67KQPHM7OKZUBDJ72DHUW6I24XKQQFK36YECYHCE';
    const event = {
      topic: [fakeScVal('pixel_placed'), fakeScVal(owner)],
      value: fakeScVal({ x: 5, y: 10, color: 3 }),
    } as unknown as Parameters<typeof decodeEvent>[0];

    expect(decodeEvent(event)).toEqual({
      name: 'pixel_placed',
      topics: [owner],
      data: { x: 5, y: 10, color: 3 },
    });
  });

  it('handles events with no additional topics beyond the name', () => {
    const event = {
      topic: [fakeScVal('round_ended')],
      value: fakeScVal(1),
    } as unknown as Parameters<typeof decodeEvent>[0];

    expect(decodeEvent(event)).toEqual({
      name: 'round_ended',
      topics: [],
      data: 1,
    });
  });
});
