import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Observable, catchError, tap, throwError } from "rxjs";

import { createApiLogger, type ApiLogger } from "../logging/api-logger";
import { getOrCreateRequestLogContext } from "../logging/request-log-context";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: ApiLogger = createApiLogger()) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const requestContext = getOrCreateRequestLogContext(request, reply);
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logRequest(request, reply.statusCode, startedAt, requestContext.requestId);
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        this.logRequest(request, statusCode, startedAt, requestContext.requestId);

        return throwError(() => error);
      })
    );
  }

  private logRequest(
    request: FastifyRequest,
    statusCode: number,
    startedAt: number,
    requestId: string
  ): void {
    const durationInMs = Date.now() - startedAt;
    const logPayload = {
      event: "http.request.completed",
      requestId,
      method: request.method,
      path: getPathWithoutQuery(request.url),
      statusCode,
      durationMs: durationInMs,
      remoteAddress: request.ip
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logPayload, "HTTP request failed");
      return;
    }

    if (statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logPayload, "HTTP request rejected");
      return;
    }

    this.logger.info(logPayload, "HTTP request completed");
  }
}

function getPathWithoutQuery(url: string): string {
  return url.split("?")[0] || "/";
}
