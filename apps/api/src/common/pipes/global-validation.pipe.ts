import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { flattenValidationErrors } from "../utils/validation-errors.util";

export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
    transformOptions: {
      enableImplicitConversion: true
    },
    validationError: {
      target: false,
      value: false
    },
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        message: "Validation failed.",
        details: flattenValidationErrors(errors)
      })
  });
}
