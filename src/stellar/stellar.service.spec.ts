import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';

const getHealth = jest.fn();
const getEvents = jest.fn();
const getLatestLedger = jest.fn();

jest.mock('@stellar/stellar-sdk', () => ({
  rpc: {
    Server: jest.fn().mockImplementation(() => ({
      getHealth,
      getEvents,
      getLatestLedger,
    })),
  },
}));

const getOrThrow = jest.fn((key: string) => {
  if (key === 'STELLAR_RPC_URL') return 'https://soroban-testnet.stellar.org';
  if (key === 'CONTRACT_ID') return 'CCONTRACTID';
  throw new Error(`unexpected config key: ${key}`);
});

describe('StellarService', () => {
  let service: StellarService;
  const config = { getOrThrow } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StellarService(config);
  });

  it('reads STELLAR_RPC_URL and CONTRACT_ID from config on construction', () => {
    expect(getOrThrow).toHaveBeenCalledWith('STELLAR_RPC_URL');
    expect(getOrThrow).toHaveBeenCalledWith('CONTRACT_ID');
  });

  it('logs health status on module init', async () => {
    getHealth.mockResolvedValue({
      status: 'healthy',
      latestLedger: 100,
      oldestLedger: 1,
      ledgerRetentionWindow: 99,
    });

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(getHealth).toHaveBeenCalledTimes(1);
  });

  it('fetches events by ledger range, defaulting startLedger to the latest ledger', async () => {
    getLatestLedger.mockResolvedValue({ sequence: 500 });
    getEvents.mockResolvedValue({ events: [], cursor: 'abc' });

    await service.getContractEvents({});

    expect(getLatestLedger).toHaveBeenCalledTimes(1);
    expect(getEvents).toHaveBeenCalledWith({
      filters: [{ type: 'contract', contractIds: ['CCONTRACTID'] }],
      startLedger: 500,
      limit: undefined,
    });
  });

  it('fetches events by explicit startLedger without calling getLatestLedger', async () => {
    getEvents.mockResolvedValue({ events: [], cursor: 'abc' });

    await service.getContractEvents({ startLedger: 42, limit: 10 });

    expect(getLatestLedger).not.toHaveBeenCalled();
    expect(getEvents).toHaveBeenCalledWith({
      filters: [{ type: 'contract', contractIds: ['CCONTRACTID'] }],
      startLedger: 42,
      limit: 10,
    });
  });

  it('fetches events by cursor, ignoring startLedger', async () => {
    getEvents.mockResolvedValue({ events: [], cursor: 'def' });

    await service.getContractEvents({ cursor: 'abc', limit: 10 });

    expect(getLatestLedger).not.toHaveBeenCalled();
    expect(getEvents).toHaveBeenCalledWith({
      filters: [{ type: 'contract', contractIds: ['CCONTRACTID'] }],
      cursor: 'abc',
      limit: 10,
    });
  });

  it('exposes the latest ledger sequence', async () => {
    getLatestLedger.mockResolvedValue({ sequence: 777 });

    await expect(service.getLatestLedger()).resolves.toBe(777);
  });
});
