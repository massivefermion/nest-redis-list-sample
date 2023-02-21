import { Controller, Get } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { AppService } from './app.service';
import { HubService } from './hub/hub.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly hubService: HubService,
  ) {}

  @Get()
  async getHello() {
    await this.hubService.emit(
      'done',
      'shayan',
      {
        username: 'credo',
        age: 32,
      },
      new ObjectId(),
      { a: new ObjectId(), b: new Date() },
      { a: { b: { a: new ObjectId(), b: new Date() } } },
    );
  }
}
