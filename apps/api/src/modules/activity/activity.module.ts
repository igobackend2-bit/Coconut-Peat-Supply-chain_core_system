import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({ imports: [IdentityModule], controllers: [ActivityController], providers: [ActivityService] })
export class ActivityModule {}
