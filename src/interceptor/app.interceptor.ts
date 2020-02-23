import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { format } from 'util';
import { LoggerService } from 'nest-logger';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class AppInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService('info', [
      LoggerService.rotate({
        fileOptions: {
          filename: `./logs/access-%DATE%.log`,
          level: 'info',
        },
      }),
    ]);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now(); // 请求开始时间

    return next.handle().pipe(
      tap(response => {
        // 调用完handle()后得到RxJs响应对象，使用tap可以得到路由函数的返回值
        const host = context.switchToHttp();
        const request = host.getRequest<Request>();

        // 打印请求方法，请求链接，处理时间和响应数据
        this.logger.log(
          format(
            '%s %s %dms %s',
            request.method,
            request.url,
            Date.now() - start,
            JSON.stringify(response),
          ),
        );
      }),
    );
  }
}
