import { Injectable } from '@nestjs/common';
import { OnEvent } from './OnEvent.decorator';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  @OnEvent('done')
  doingIt(...args) {
    console.dir(args, { depth: 2 });
  }
}
