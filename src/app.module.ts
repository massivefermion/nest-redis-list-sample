import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FiboModule } from './fibo/fibo.module';

@Module({
  imports: [FiboModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
