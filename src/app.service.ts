import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { OnEvent } from './OnEvent.decorator';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly client: MongoClient;
  private db: Db;

  constructor() {
    this.client = new MongoClient('mongodb://localhost');
  }

  async onModuleInit() {
    await this.client.connect();
    this.db = this.client.db('EldenRing');
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  getHello(): string {
    return 'Hello World!';
  }

  @OnEvent('done')
  async doingIt(...args) {
    await this.db.collection('data').insertMany(args);
    console.dir(args, { depth: 2 });
  }
}
