import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Redis } from 'ioredis';
import { EVENT_LISTENER_METADATA } from './constants';
import { ObjectId } from 'mongodb';

@Injectable()
export class HubService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly subscriber: Redis;
  private readonly handlers: Record<string, Function[]> = {};

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly metadataScanner: MetadataScanner,
  ) {
    this.redis = new Redis();
    this.subscriber = new Redis();
  }

  async onModuleInit() {
    this.prepareHandlers();
    this.subscriber.psubscribe('__keyevent@0__:lpush');
    this.subscriber.on('pmessage', (_, __, redisList) => {
      this.dealWithEvent(redisList);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
    await this.subscriber.quit();
  }

  async emit(event: string, ...data: unknown[]) {
    await this.redis.lpush(event, JSON.stringify(data));
  }

  async dealWithEvent(event) {
    const eventHandlers = this.handlers[event];
    const msg = await this.redis.rpop(event);
    const rawArgs = JSON.parse(msg);
    const args = rawArgs.map(HubService.parseRawArg);
    await Promise.all(eventHandlers.map((handler) => handler(...args)));
  }

  private prepareHandlers() {
    const providers = this.discoveryService.getProviders();
    providers
      .filter((wrapper) => wrapper.instance && !wrapper.isAlias)
      .forEach((wrapper: InstanceWrapper) => {
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance) || {};
        const handlers = this.metadataScanner.scanFromPrototype(
          instance,
          prototype,
          (methodKey: string) => {
            const eventListenerMetadata = this.reflector.get(
              EVENT_LISTENER_METADATA,
              instance[methodKey],
            );
            if (!eventListenerMetadata) return;
            return {
              event: eventListenerMetadata.event,
              handler: instance[methodKey],
            };
          },
        );

        for (const { event, handler } of handlers) {
          if (!this.handlers[event]) {
            this.handlers[event] = [handler];
          } else {
            this.handlers[event].push(handler);
          }
        }
      });
  }

  private static parseRawArg(rawArg: any) {
    if (Array.isArray(rawArg)) {
      const arg = [];
      for (const rawElement of rawArg) {
        arg.push(HubService.parseRawArg(rawElement));
      }
      return arg;
    }

    if (typeof rawArg == 'object') {
      const arg = {};
      for (const [key, value] of Object.entries(rawArg)) {
        arg[key] = HubService.parseRawArg(value);
      }
      return arg;
    }

    if (typeof rawArg == 'number') {
      return rawArg;
    }

    if (/^[0-9a-fA-F]{24}$/.test(rawArg)) {
      return new ObjectId(rawArg);
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(rawArg)) {
      return new Date(rawArg);
    }

    return rawArg;
  }
}
