import { fibo } from './job';
import { Redis } from 'ioredis';

function sleep(n: number) {
  return new Promise((resolve) => setTimeout(resolve, n * 1000));
}

const redis = new Redis();
async function loop() {
  console.log('flag 1');
  const [_, msg] = await redis.brpop('fibo', 0);
  console.log('flag 2');
  const { n } = JSON.parse(msg);
  if (Math.random() < 0.25) {
    await sleep(n / 2);
    await redis.lpush('to-retry', msg);
  } else {
    fibo(n);
  }
}

while (true) {
  loop();
}
