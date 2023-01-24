import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { FiboService } from './fibo.service';

@Controller('fibo')
export class FiboController {
  constructor(private readonly fibo: FiboService) {}

  @Get(':n')
  async calculate(@Param('n', ParseIntPipe) n: number) {
    return { result: this.fibo.fibo(n) };
  }

  @Get('as-job/:n')
  async calculateAsJob(@Param('n', ParseIntPipe) n: number) {
    const id = await this.fibo.enqueue(n);
    const result = await this.fibo.waitForResult(id);
    return { result };
  }
}
