import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Observable, catchError, tap, throwError } from "rxjs";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logRequest(request, reply.statusCode, startedAt);
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        this.logRequest(request, statusCode, startedAt);

        return throwError(() => error);
      })
    );
  }

  private logRequest(
    request: FastifyRequest,
    statusCode: number,
    startedAt: number
  ): void {
    const durationInMs = Date.now() - startedAt;
    const message = `${request.method} ${request.url} ${statusCode} - ${durationInMs}ms`;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message);
      return;
    }

    if (statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(message);
      return;
    }

    this.logger.log(message);
  }
}
