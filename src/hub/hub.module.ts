import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { HubService } from './hub.service';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [HubService],
  exports: [HubService],
})
export class HubModule {}
