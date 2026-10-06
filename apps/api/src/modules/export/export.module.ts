import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({ imports: [IdentityModule], controllers: [ExportController], providers: [ExportService] })
export class ExportModule {}
