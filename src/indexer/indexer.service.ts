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
import { CursorRepository } from './cursor.repository';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const EVENTS_PER_POLL = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls the Stellar RPC for canvas contract events and dispatches them
 * to the matching handler.
 *
 * The cursor is persisted in Postgres (via `CursorRepository`), keyed by
 * contract, so a restart resumes from the last successfully processed
 * position instead of re-polling from `START_LEDGER` every time. See the
 * README's "Resumability" section.
 */
@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private readonly pollIntervalMs: number;
  private readonly startLedger?: number;
  private readonly contractId: string;
  private cursor?: string;
  private stopped = false;
  private loop?: Promise<void>;

  constructor(
    private readonly stellar: StellarService,
    private readonly pixelPlacedHandler: PixelPlacedHandler,
    private readonly cursorRepository: CursorRepository,
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

    this.contractId = this.config.getOrThrow<string>('CONTRACT_ID');
  }

  async onModuleInit(): Promise<void> {
    await this.loadCursor();
    this.loop = this.runLoop();
  }

  /** Loads the persisted cursor for this contract. Exposed for testing. */
  async loadCursor(): Promise<void> {
    this.cursor = await this.cursorRepository.get(this.contractId);
    this.logger.log(
      this.cursor
        ? `Resuming from persisted cursor`
        : `No persisted cursor found, starting from startLedger=${
            this.startLedger ?? 'latest'
          }`,
    );
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
      await this.dispatch(event);
    }

    this.cursor = response.cursor;
    await this.cursorRepository.set(this.contractId, this.cursor);
  }

  private async dispatch(
    event: Parameters<typeof decodeEvent>[0],
  ): Promise<void> {
    const decoded = decodeEvent(event);

    switch (decoded.name) {
      case 'pixel_placed': {
        const data = decoded.data as { x: number; y: number; color: number };
        const owner = decoded.topics[0] as string;
        await this.pixelPlacedHandler.handle({ owner, ...data });
        break;
      }
      default:
        this.logger.debug(`Ignoring unhandled event: ${decoded.name}`);
    }
  }
}
