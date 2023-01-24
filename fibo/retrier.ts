import { fibo } from './job';
import { Redis } from 'ioredis';

function sleep(n: number) {
  return new Promise((resolve) => setTimeout(resolve, n * 1000));
}

const redis = new Redis();
async function loop() {
  while (true) {
    const [_, msg] = await redis.brpop('to-retry', 0);
    const { id, n } = JSON.parse(msg);
    if (Math.random() < 0.25) {
      await sleep(n / 10);
      await redis.lpush('to-retry', msg);
    } else {
      const result = fibo(n);
      await redis.set(id, result);
    }
  }
}

loop().then(process.exit.bind(null, 0));
