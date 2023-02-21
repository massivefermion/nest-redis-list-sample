import { Inject, SetMetadata } from '@nestjs/common';
import { HubService } from './hub/hub.service';

export const OnEvent = (event: string): MethodDecorator =>
  SetMetadata('EVENT_LISTENER_METADATA', { event });
