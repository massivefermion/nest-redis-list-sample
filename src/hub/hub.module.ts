import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventsMetadataAccessor } from './events-metadata.accessor';
import { HubService } from './hub.service';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [HubService, EventsMetadataAccessor],
  exports: [HubService],
})
export class HubModule {}
