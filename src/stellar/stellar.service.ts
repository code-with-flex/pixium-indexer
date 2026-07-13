import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rpc } from '@stellar/stellar-sdk';

export interface GetContractEventsParams {
  /** Ledger to start fetching from. Ignored if `cursor` is provided. */
  startLedger?: number;
  /** Resume pagination from a previous response's `cursor`. */
  cursor?: string;
  limit?: number;
}

/**
 * Thin wrapper around the Stellar RPC client. Owns the connection to the
 * configured RPC node and knows how to fetch contract events for the
 * canvas contract — nothing more. Parsing event payloads, tracking the
 * last-processed ledger, and dispatching to handlers belongs to the
 * indexer polling loop (a separate module), not here.
 */
@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private readonly server: rpc.Server;
  private readonly contractId: string;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.getOrThrow<string>('STELLAR_RPC_URL');
    this.contractId = this.config.getOrThrow<string>('CONTRACT_ID');
    this.server = new rpc.Server(rpcUrl);
  }

  /**
   * Fails fast on startup if the configured RPC node is unreachable or
   * misconfigured, rather than surfacing that failure later during the
   * first poll.
   */
  async onModuleInit(): Promise<void> {
    const health = await this.server.getHealth();
    this.logger.log(
      `Connected to Stellar RPC (status: ${health.status}, latestLedger: ${health.latestLedger})`,
    );
  }

  /**
   * Fetches contract events for the configured canvas contract. Callers
   * choose either ledger-range mode (`startLedger`) for a fresh start, or
   * cursor mode (`cursor`) to resume pagination — matching the RPC's own
   * mutually exclusive modes.
   */
  async getContractEvents(
    params: GetContractEventsParams,
  ): Promise<rpc.Api.GetEventsResponse> {
    const { startLedger, cursor, limit } = params;
    const filters: rpc.Api.EventFilter[] = [
      { type: 'contract', contractIds: [this.contractId] },
    ];

    if (cursor) {
      return this.server.getEvents({ filters, cursor, limit });
    }

    return this.server.getEvents({
      filters,
      startLedger: startLedger ?? (await this.getLatestLedger()),
      limit,
    });
  }

  async getLatestLedger(): Promise<number> {
    const { sequence } = await this.server.getLatestLedger();
    return sequence;
  }
}
