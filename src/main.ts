import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppInterceptor } from './interceptor/app.interceptor';
import { AllExceptionsFilter } from './filter/any-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new AppInterceptor())


  await app.listen(3000);
}
bootstrap();
