import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

/**
 * Everything that makes the HTTP layer safe, shared by main.ts and the
 * integration tests so the tests exercise the real configuration.
 */
export function configureApp(app: NestExpressApplication): void {
  // Standard security headers (nosniff, frameguard, HSTS over HTTPS, no x-powered-by, …).
  app.use(helmet());

  // Only the web app's origin(s) may call this API from a browser. Set CORS_ORIGINS
  // (comma-separated) in production; the default is the local Vite dev server.
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], maxAge: 600 });

  // Behind a reverse proxy/load balancer the client IP (used by rate limiting) is in
  // X-Forwarded-For. Set TRUST_PROXY to the number of proxy hops; leave unset otherwise,
  // or anyone could spoof their IP and dodge the limiter.
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
}
