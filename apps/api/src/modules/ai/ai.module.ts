import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({ imports: [IdentityModule, FinanceModule], controllers: [AiController], providers: [AiService] })
export class AiModule {}
