import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVisitaEvaluacionDto {
  @ApiProperty({
    example: 1,
    description: "Orden de la evaluacion dentro de la visita."
  })
  @Transform(({ value }) => parseInteger(value))
  @IsInt({
    message: "order must be an integer."
  })
  @Min(1)
  order!: number;

  @ApiPropertyOptional({
    example: 50,
    description: "Porcentaje entre 0 y 100."
  })
  @Transform(({ value }) => parseOptionalNumber(value))
  @IsOptional()
  @IsNumber(
    {
      maxDecimalPlaces: 2
    },
    {
      message: "percentage must be a valid number."
    }
  )
  @Min(0)
  @Max(100)
  percentage?: number | null;

  @ApiProperty({
    example: "Buen desarrollo vegetativo."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;
}

function trimRequiredString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseInteger(value: unknown): number | unknown {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : value;
}

function parseOptionalNumber(value: unknown): number | null | undefined | unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : value;
}
