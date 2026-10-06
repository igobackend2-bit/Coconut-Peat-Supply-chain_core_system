import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { DRIZZLE, DrizzleDb, drizzleProvider } from './drizzle.provider';

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
export class DrizzleModule implements OnApplicationShutdown {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** Release the connection pool when the app closes (tests, graceful shutdown). */
  async onApplicationShutdown() {
    await (this.db as unknown as { $client?: { end: () => Promise<void> } }).$client?.end();
  }
}
