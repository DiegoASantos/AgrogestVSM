import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

import { createErrorResponse } from "../http/api-response";
import { createApiLogger, type ApiLogger } from "../logging/api-logger";
import { getOrCreateRequestLogContext } from "../logging/request-log-context";

type NormalizedException = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly isDevelopment: boolean,
    private readonly logger: ApiLogger = createApiLogger()
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const sensitiveFinancialRoute = isSensitiveFinancialRoute(request.url);
    const normalizedException = this.normalizeException(
      exception,
      sensitiveFinancialRoute
    );
    const requestContext = getOrCreateRequestLogContext(request, reply);

    if (normalizedException.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          event: "http.request.exception",
          requestId: requestContext.requestId,
          method: request.method,
          path: getPathWithoutQuery(request.url),
          statusCode: normalizedException.statusCode,
          errorCode: normalizedException.code,
          ...(!sensitiveFinancialRoute
            ? {
                error:
                  exception instanceof Error
                    ? exception
                    : new Error(normalizedException.message)
              }
            : {})
        },
        "Unhandled HTTP exception"
      );
    }

    const response = createErrorResponse({
      statusCode: normalizedException.statusCode,
      code: normalizedException.code,
      message: normalizedException.message,
      path: request.url,
      method: request.method,
      details: sensitiveFinancialRoute ? undefined : normalizedException.details
    });

    void reply.status(normalizedException.statusCode).send(response);
  }

  private normalizeException(
    exception: unknown,
    sensitiveFinancialRoute: boolean
  ): NormalizedException {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === "string") {
        return {
          statusCode,
          code: this.getHttpStatusCode(statusCode),
          message: response
        };
      }

      if (isRecord(response)) {
        const message = sensitiveFinancialRoute && response.message === "Validation failed."
          ? safeFinancialValidationMessage(response.details)
          : this.getMessage(response.message, exception.message);
        const details = response.details ?? this.getDetails(response.message);

        return {
          statusCode,
          code: this.getErrorCode(statusCode, response.error),
          message,
          ...(details !== undefined ? { details } : {})
        };
      }

      return {
        statusCode,
        code: this.getHttpStatusCode(statusCode),
        message: exception.message
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
      ...(this.isDevelopment && !sensitiveFinancialRoute && exception instanceof Error
        ? {
            details: {
              message: exception.message
            }
          }
        : {})
    };
  }

  private getMessage(value: unknown, fallbackMessage: string): string {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    return fallbackMessage;
  }

  private getDetails(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value;
    }

    return undefined;
  }

  private getErrorCode(statusCode: number, error: unknown): string {
    if (typeof error === "string" && error.trim().length > 0) {
      return error.trim().replace(/\s+/g, "_").toUpperCase();
    }

    return this.getHttpStatusCode(statusCode);
  }

  private getHttpStatusCode(statusCode: number): string {
    const label = HttpStatus[statusCode];

    return typeof label === "string" ? label : "HTTP_ERROR";
  }
}

export function isSensitiveFinancialRoute(url: string) {
  const path = url.split("?")[0] || "/";
  return (
    path === "/pagos" ||
    path.startsWith("/pagos/") ||
    path === "/comercial/mantenimiento/acreedores-cosecha" ||
    path.startsWith("/comercial/mantenimiento/acreedores-cosecha/")
  );
}

const safePaymentFields: Record<string, string> = {
  productorId: "productor", sistemaOrigen: "sistema de origen", nroGuia: "número de guía",
  lote: "lote", protocolo: "protocolo", variedad: "variedad", tipoCultivo: "tipo de cultivo",
  categoria: "categoría", destino: "destino", fechaCosecha: "fecha de cosecha",
  fechaRecepcion: "fecha de recepción", jabas: "jabas", pesoBruto: "peso bruto",
  pesoTara: "peso tara", pesoNeto: "peso neto", pesoPromedio: "peso promedio",
  exportador: "exportador", codigoProductorOrigen: "código del productor de origen",
  nombreProductorOrigen: "nombre del productor de origen", acreedorId: "acreedor aprobado",
  supervisorId: "supervisor", cantidadJabas: "cantidad de jabas", precioJaba: "precio por jaba",
  precioKilo: "precio por kilo", precioBase: "base del precio",
  porcentajePeso: "porcentaje de peso", aplicaFairtrade: "Fairtrade",
  subTotal: "subtotal", tipoDescuento: "tipo de descuento",
  montoDescuento: "monto de descuento", totalPostDescuento: "total después del descuento",
  detraccion: "detracción", totalPostDetraccion: "total después de detracción",
  nroLiquidacion: "número de liquidación", observacion: "observación",
  estado: "estado", fechaPago: "fecha de pago", tipoDocumentoProductor: "tipo de documento",
  nroDocumentoProductor: "número de documento", tipoDocumentoAcreedor: "tipo de documento",
  nroDocumentoAcreedor: "número de documento", tipoDocumento: "tipo de documento",
  nroDocumento: "número de documento", nombres: "nombres", apellidos: "apellidos",
  banco: "banco", nroCuenta: "cuenta o CCI"
};

export function safeFinancialValidationMessage(details: unknown): string {
  if (!Array.isArray(details)) return "Revisa los campos del formulario.";
  for (const issue of details) {
    if (!isRecord(issue) || typeof issue.field !== "string") continue;
    if (["tipoDocumento", "nroDocumento", "nombres", "apellidos", "banco", "nroCuenta"].includes(issue.field)) {
      return `Revisa el acreedor: ${safePaymentFields[issue.field]}.`;
    }
    const match = /^(cabecera|detalles\.(\d+))\.([A-Za-z]+)$/.exec(issue.field);
    if (!match) continue;
    const label = safePaymentFields[match[3]];
    if (!label) continue;
    return match[1] === "cabecera"
      ? `Revisa la cabecera: ${label}.`
      : `Revisa el detalle ${Number(match[2]) + 1}: ${label}.`;
  }
  return "Revisa los campos del formulario.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getPathWithoutQuery(url: string): string {
  return url.split("?")[0] || "/";
}
