import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { StellarModule } from '../stellar/stellar.module';
import { IndexerService } from './indexer.service';

@Module({
  imports: [StellarModule, EventsModule],
  providers: [IndexerService],
})
export class IndexerModule {}
