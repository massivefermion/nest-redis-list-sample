import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ContextIdFactory,
  DiscoveryService,
  MetadataScanner,
  ModuleRef,
} from '@nestjs/core';
import { Injector } from '@nestjs/core/injector/injector';
import {
  ContextId,
  InstanceWrapper,
} from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { Redis } from 'ioredis';
import { ObjectId } from 'mongodb';
import { EventsMetadataAccessor } from './events-metadata.accessor';

@Injectable()
export class HubService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly subscriber: Redis;
  private readonly injector = new Injector();
  private readonly handlers: Record<string, Function[]> = {};

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: EventsMetadataAccessor,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
  ) {
    this.redis = new Redis();
    this.subscriber = new Redis();
  }

  onModuleInit() {
    this.loadEventListeners();
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

  loadEventListeners() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();
    [...providers, ...controllers]
      .filter((wrapper) => wrapper.instance && !wrapper.isAlias)
      .forEach((wrapper: InstanceWrapper) => {
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance) || {};
        const isRequestScoped = !wrapper.isDependencyTreeStatic();
        this.metadataScanner.scanFromPrototype(
          instance,
          prototype,
          (methodKey: string) =>
            this.subscribeToEventIfListener(
              instance,
              methodKey,
              isRequestScoped,
              wrapper.host as Module,
            ),
        );
      });
  }

  private subscribeToEventIfListener(
    instance: Record<string, any>,
    methodKey: string,
    isRequestScoped: boolean,
    moduleRef: Module,
  ) {
    const eventListenerMetadata = this.metadataAccessor.getEventHandlerMetadata(
      instance[methodKey],
    );
    if (!eventListenerMetadata) {
      return;
    }

    const { event } = eventListenerMetadata;
    const listenerMethod = instance[methodKey];

    if (isRequestScoped) {
      this.registerRequestScopedListener({
        event,
        eventListenerInstance: instance,
        listenerMethod,
        listenerMethodKey: methodKey,
        moduleRef,
      });
    } else {
      listenerMethod(event, (...args: unknown[]) =>
        instance[methodKey].call(instance, ...args),
      );
    }
  }

  private registerRequestScopedListener(eventListenerContext: {
    listenerMethod: Function;
    event: string | symbol | (string | symbol)[];
    eventListenerInstance: Record<string, any>;
    moduleRef: Module;
    listenerMethodKey: string;
  }) {
    const {
      listenerMethod,
      event,
      eventListenerInstance,
      moduleRef,
      listenerMethodKey,
    } = eventListenerContext;

    listenerMethod(event, async (...args: unknown[]) => {
      const contextId = ContextIdFactory.create();

      this.registerEventPayloadByContextId(args, contextId);

      const contextInstance = await this.injector.loadPerContext(
        eventListenerInstance,
        moduleRef,
        moduleRef.providers,
        contextId,
      );
      return contextInstance[listenerMethodKey].call(contextInstance, ...args);
    });
  }

  private registerEventPayloadByContextId(
    eventPayload: unknown[],
    contextId: ContextId,
  ) {
    const payloadObjectOrArray =
      eventPayload.length > 1 ? eventPayload : eventPayload[0];

    this.moduleRef.registerRequestByContextId(payloadObjectOrArray, contextId);
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
