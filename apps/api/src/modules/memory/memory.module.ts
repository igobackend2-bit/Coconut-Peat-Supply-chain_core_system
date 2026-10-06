import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';

@Module({ imports: [IdentityModule], controllers: [MemoryController], providers: [MemoryService] })
export class MemoryModule {}
