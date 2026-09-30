import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Frontend (apps/web) is always a different origin from this API, even
  // in prod. Wide open for now (no auth exists yet to protect this with
  // real origin scoping — now that auth *does* exist, revisit alongside
  // docs/security.md).
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Coco Pith Factory API listening on port ${port}`);
}
bootstrap();
