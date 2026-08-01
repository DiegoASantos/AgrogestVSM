import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ORGANOS_AFECTADOS } from "../../../visita-observaciones-sanitarias/domain/organo-afectado";

export class CreateVisitaEvaluacionDto {
  @ApiPropertyOptional({
    example: "1",
    description: "Id del nutriente cuando la evaluación corresponde a Nutrición."
  })
  @Transform(({ value }) => parseOptionalId(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, { message: "nutrientId must be a positive integer." })
  nutrientId?: string | null;

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

  @ApiPropertyOptional({
    example: 15,
    description: "Porcentaje de arboles afectados. Entero entre 0 y 100."
  })
  @Transform(({ value }) => parseOptionalNumber(value))
  @IsOptional()
  @IsInt({
    message: "incidencePercentage must be an integer."
  })
  @Min(0)
  @Max(100)
  incidencePercentage?: number | null;

  @ApiProperty({
    example: "Buen desarrollo vegetativo."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  @ApiPropertyOptional({
    example: ["hoja_tierna", "raices"],
    description: "Organos afectados por la deficiencia nutricional.",
    enum: ORGANOS_AFECTADOS,
    isArray: true
  })
  @Transform(({ value }) => normalizeOrganosAfectados(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(ORGANOS_AFECTADOS, { each: true })
  organosAfectados?: string[];
}

function trimRequiredString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseOptionalId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return String(value).trim();
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

function normalizeOrganosAfectados(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) =>
    String(item ?? "")
      .trim()
      .toLowerCase()
  );
}
