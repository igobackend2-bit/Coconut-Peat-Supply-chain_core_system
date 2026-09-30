import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthFailureAuditFilter } from './auth-failure-audit.filter';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AuthFailureAuditFilter },
  ],
})
export class AuditModule {}
