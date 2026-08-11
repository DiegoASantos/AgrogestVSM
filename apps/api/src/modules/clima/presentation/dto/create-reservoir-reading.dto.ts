import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

export class CreateReservoirReadingDto {
  @ApiProperty({
    enum: RESERVOIR_VARIABLES,
    example: "volumen_mmc",
    description: "Variable hídrica registrada para el reservorio."
  })
  @IsIn(RESERVOIR_VARIABLES)
  variable!: ReservoirVariable;

  @ApiProperty({
    example: 512.4,
    description: "Valor no negativo de la lectura."
  })
  @Transform(({ value }) => toStrictNumber(value))
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  valor!: number | string;

  @ApiProperty({
    example: "MMC",
    description: "Unidad correspondiente a la variable seleccionada."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(20)
  unidad!: string;

  @ApiPropertyOptional({
    enum: RESERVOIR_READING_TYPES,
    default: "OBSERVADO",
    description: "Origen técnico del valor registrado."
  })
  @IsOptional()
  @IsIn(RESERVOIR_READING_TYPES)
  tipo?: ReservoirReadingType;

  @ApiProperty({
    example: "2026-08-11T08:00:00-05:00",
    description: "Fecha y hora ISO 8601 en que se obtuvo el dato."
  })
  @IsISO8601({ strict: true })
  @Matches(ISO_DATETIME_WITH_TIMEZONE, {
    message: "dato_at debe incluir fecha, hora y zona horaria."
  })
  dato_at!: string;
}
