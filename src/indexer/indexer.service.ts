import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PixelPlacedHandler } from '../events/handlers/pixel-placed.handler';
import { decodeEvent } from '../events/decode-event';
import { StellarService } from '../stellar/stellar.service';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const EVENTS_PER_POLL = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls the Stellar RPC for canvas contract events and dispatches them
 * to the matching handler.
 *
 * The cursor is kept in memory only for now — a restart re-polls from
 * `START_LEDGER` (or the current latest ledger, if unset) rather than
 * resuming. Persisting the cursor in Postgres is a separate follow-up
 * slice; see the README's "Resumability" section for the intended
 * behavior once that lands.
 */
@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private readonly pollIntervalMs: number;
  private readonly startLedger?: number;
  private cursor?: string;
  private stopped = false;
  private loop?: Promise<void>;

  constructor(
    private readonly stellar: StellarService,
    private readonly pixelPlacedHandler: PixelPlacedHandler,
    private readonly config: ConfigService,
  ) {
    const configuredInterval = this.config.get<string>('POLL_INTERVAL_MS');
    this.pollIntervalMs = configuredInterval
      ? Number(configuredInterval)
      : DEFAULT_POLL_INTERVAL_MS;

    const configuredStartLedger = this.config.get<string>('START_LEDGER');
    this.startLedger = configuredStartLedger
      ? Number(configuredStartLedger)
      : undefined;
  }

  onModuleInit(): void {
    this.loop = this.runLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    await this.loop;
  }

  private async runLoop(): Promise<void> {
    while (!this.stopped) {
      try {
        await this.pollOnce();
      } catch (error) {
        this.logger.error(
          'Poll failed',
          error instanceof Error ? error.stack : error,
        );
      }
      await sleep(this.pollIntervalMs);
    }
  }

  /** Fetches and dispatches one page of events. Exposed for testing. */
  async pollOnce(): Promise<void> {
    const response = this.cursor
      ? await this.stellar.getContractEvents({
          cursor: this.cursor,
          limit: EVENTS_PER_POLL,
        })
      : await this.stellar.getContractEvents({
          startLedger: this.startLedger,
          limit: EVENTS_PER_POLL,
        });

    for (const event of response.events) {
      this.dispatch(event);
    }

    this.cursor = response.cursor;
  }

  private dispatch(event: Parameters<typeof decodeEvent>[0]): void {
    const decoded = decodeEvent(event);

    switch (decoded.name) {
      case 'pixel_placed': {
        const data = decoded.data as { x: number; y: number; color: number };
        const owner = decoded.topics[0] as string;
        this.pixelPlacedHandler.handle({ owner, ...data });
        break;
      }
      default:
        this.logger.debug(`Ignoring unhandled event: ${decoded.name}`);
    }
  }
}
