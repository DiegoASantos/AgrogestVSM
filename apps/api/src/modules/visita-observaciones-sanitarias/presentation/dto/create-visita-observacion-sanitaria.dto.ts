import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ORGANOS_AFECTADOS } from "../../domain/organo-afectado";

export class CreateVisitaObservacionSanitariaDto {
  @ApiProperty({
    example: "1",
    description: "Id de la plaga o enfermedad observada."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "pestDiseaseId must be a positive integer."
  })
  pestDiseaseId!: string;

  @ApiPropertyOptional({
    example: 1,
    description: "Id del nivel de incidencia."
  })
  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({
    message: "incidenceLevelId must be an integer."
  })
  @Min(1)
  incidenceLevelId?: number | null;

  @ApiPropertyOptional({
    example: 4,
    description: "Id del nivel de severidad."
  })
  @Transform(({ value }) => parseOptionalInteger(value))
  @IsOptional()
  @IsInt({
    message: "severityLevelId must be an integer."
  })
  @Min(1)
  severityLevelId?: number | null;

  @ApiPropertyOptional({
    example: "Se observaron manchas foliares leves."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observation?: string | null;

  @ApiProperty({
    example: ["hoja_tierna", "fruto_verde"],
    description: "Organos de la planta afectados por la plaga o enfermedad.",
    enum: ORGANOS_AFECTADOS,
    isArray: true
  })
  @Transform(({ value }) => normalizeOrganosAfectados(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(ORGANOS_AFECTADOS, { each: true })
  organosAfectados!: string[];
}

function trimRequiredString(value: unknown): string {
  return String(value ?? "").trim();
}

function trimOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalizedValue = String(value ?? "").trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseOptionalInteger(value: unknown): number | null | undefined | unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : value;
}

function normalizeOrganosAfectados(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) =>
    String(item ?? "")
      .trim()
      .toLowerCase()
  );
}
