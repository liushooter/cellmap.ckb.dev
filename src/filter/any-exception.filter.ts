import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from 'nest-logger';
import { format } from 'util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService('info', [
      LoggerService.rotate({
        fileOptions: {
          filename: `./logs/error-%DATE%.log`,
          level: 'info',
        },
      }),
    ]);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    this.logger.log(
      format(
        '%s %s %s %s',
        request.method,
        request.url,
        exception instanceof Error ? exception?.stack : exception,
      ),
    );


    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}