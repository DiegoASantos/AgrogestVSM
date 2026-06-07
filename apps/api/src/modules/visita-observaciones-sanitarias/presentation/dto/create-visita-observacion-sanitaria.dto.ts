import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
