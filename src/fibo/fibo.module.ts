import { Module } from '@nestjs/common';
import { FiboService } from './fibo.service';
import { FiboController } from './fibo.controller';

@Module({
  providers: [FiboService],
  controllers: [FiboController]
})
export class FiboModule {}
