import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from "class-validator";

import {
  RESERVOIR_READING_TYPES,
  RESERVOIR_VARIABLES,
  type ReservoirReadingType,
  type ReservoirVariable
} from "../../application/reservoir-reading.constants";
import {
  ISO_DATETIME_WITH_TIMEZONE,
  toStrictNumber
} from "./reservoir-reading-validation";

export class UpdateReservoirReadingDto {
  @ApiPropertyOptional({ enum: RESERVOIR_VARIABLES })
  @IsOptional()
  @IsIn(RESERVOIR_VARIABLES)
  variable?: ReservoirVariable;

  @ApiPropertyOptional({ example: 512.4, minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => toStrictNumber(value))
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  valor?: number | string;

  @ApiPropertyOptional({ example: "MMC", maxLength: 20 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(20)
  unidad?: string;

  @ApiPropertyOptional({ enum: RESERVOIR_READING_TYPES })
  @IsOptional()
  @IsIn(RESERVOIR_READING_TYPES)
  tipo?: ReservoirReadingType;

  @ApiPropertyOptional({ example: "2026-08-11T08:00:00-05:00" })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(ISO_DATETIME_WITH_TIMEZONE, {
    message: "dato_at debe incluir fecha, hora y zona horaria."
  })
  dato_at?: string;
}
