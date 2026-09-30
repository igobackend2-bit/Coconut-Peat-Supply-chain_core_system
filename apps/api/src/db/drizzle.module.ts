import { Global, Module } from '@nestjs/common';
import { drizzleProvider } from './drizzle.provider';

/**
 * Global module exposing the Drizzle DB client (token: DRIZZLE) to every
 * other module via dependency injection, per ADR-004. Business modules
 * should inject `@Inject(DRIZZLE) private readonly db: DrizzleDb` rather
 * than creating their own database connections.
 */
@Global()
@Module({
  providers: [drizzleProvider],
  exports: [drizzleProvider],
})
export class DrizzleModule {}
