import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppInterceptor } from './interceptor/app.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalInterceptors(new AppInterceptor())
  await app.listen(3000);
}
bootstrap();
