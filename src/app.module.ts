import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FiboModule } from './fibo/fibo.module';
import { HubModule } from './hub/hub.module';

@Module({
  imports: [FiboModule, HubModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
