import { rpc, scValToNative } from '@stellar/stellar-sdk';

export interface DecodedEvent {
  /** The event's name — by `#[contractevent]` convention, always the
   * first topic. E.g. "pixel_placed". */
  name: string;
  /** Remaining topics after the name (e.g. the `owner` address for
   * `pixel_placed`, since it's declared `#[topic]` in the contract). */
  topics: unknown[];
  /** The event's non-topic fields (the contractevent's data payload). */
  data: unknown;
}

/**
 * Converts a raw RPC event's XDR topics/value into plain JS values.
 * `#[contractevent]` structs always put the event name as the first
 * topic, so we split it out here rather than making every caller redo
 * that.
 */
export function decodeEvent(event: rpc.Api.EventResponse): DecodedEvent {
  const decodedTopics: unknown[] = event.topic.map((topic): unknown =>
    scValToNative(topic),
  );
  const [name, ...topics] = decodedTopics;
  const data: unknown = scValToNative(event.value);

  return { name: name as string, topics, data };
}
