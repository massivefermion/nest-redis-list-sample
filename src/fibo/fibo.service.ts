import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class FiboService {
  private readonly redisClient: Redis;
  private readonly baseCases = Object.freeze({
    0: 0,
    1: 1,
  });

  constructor() {
    this.redisClient = new Redis();
  }

  async enqueue(n: number) {
    const id = randomUUID();
    const msg = JSON.stringify({ id, n });
    await this.redisClient.lpush('fibo', msg);
    return id;
  }

  async waitForResult(id: string) {
    let result;
    while (true) {
      result = await this.redisClient.get(id);
      if (result) break;
    }
    await this.redisClient.del(id);
    return result;
  }

  fibo(n) {
    return isNaN(this.baseCases[n])
      ? this.fibo(n - 1) + this.fibo(n - 2)
      : this.baseCases[n];
  }
}
