import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVisitaCampoDto {
  @ApiPropertyOptional({
    example: "9f6c2d56-4b6e-4a96-a48b-f55eb0f25281",
    description: "Id publico del cliente para idempotencia de sincronizacion."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsUUID("4", {
    message: "publicId must be a valid UUID."
  })
  publicId?: string | null;

  @ApiPropertyOptional({
    example: "FIC-2026-0001"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nroFicha?: string | null;

  @ApiProperty({
    example: "1",
    description: "Id del cultivo asociado."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "cropId must be a positive integer."
  })
  cropId!: string;

  @ApiProperty({
    example: "1",
    description: "Id de la variedad asociada."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "varietyId must be a positive integer."
  })
  varietyId!: string;

  @ApiProperty({
    example: "1",
    description: "Id de la parcela asociada."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "parcelaId must be a positive integer."
  })
  parcelaId!: string;

  @ApiProperty({
    example: "1",
    description: "Id de la campania asociada."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "campaignId must be a positive integer."
  })
  campaignId!: string;

  @ApiProperty({
    example: "1",
    description: "Id del usuario agronomo."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "agronomistUserId must be a positive integer."
  })
  agronomistUserId!: string;

  @ApiPropertyOptional({
    example: 120,
    description: "Numero de plantas evaluadas."
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalInteger(value))
  @IsInt({
    message: "plantsCount must be an integer."
  })
  @Min(0)
  plantsCount?: number | null;

  @ApiPropertyOptional({
    example: "12.5000",
    description: "Area observada en hectareas. Debe ser mayor que cero."
  })
  @Transform(({ value }) => normalizeOptionalDecimal(value))
  @IsOptional()
  @Matches(/^\d+(\.\d+)?$/, {
    message: "areaHectares must be a positive decimal number."
  })
  areaHectares?: string | null;

  @ApiPropertyOptional({
    example: "2026-03-10"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString(
    {},
    {
      message: "sowingDate must be a valid ISO 8601 date string."
    }
  )
  sowingDate?: string | null;

  @ApiProperty({
    example: "2026-04-04"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsDateString(
    {},
    {
      message: "visitDate must be a valid ISO 8601 date string."
    }
  )
  visitDate!: string;

  @ApiProperty({
    example: "08:30:00"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: "startVisitTime must be a valid time in HH:mm or HH:mm:ss format."
  })
  startVisitTime!: string;

  @ApiPropertyOptional({
    example: "10:15:00"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: "endVisitTime must be a valid time in HH:mm or HH:mm:ss format."
  })
  endVisitTime?: string | null;

  @ApiPropertyOptional({
    example: "1"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "phenologicalStageId must be a positive integer."
  })
  phenologicalStageId?: string | null;

  @ApiPropertyOptional({
    example: "1"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "subEtapaId must be a positive integer."
  })
  subEtapaId?: string | null;

  @ApiPropertyOptional({
    example: 50
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  subEtapaPercentage?: number | null;

  @ApiPropertyOptional({
    example: "Observacion general de la visita."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  generalObservation?: string | null;

  @ApiPropertyOptional({
    example: "Ing. Perez"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  agronomistSignatureName?: string | null;

  @ApiPropertyOptional({
    example: "Juan Productor"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  producerSignatureName?: string | null;

  @ApiPropertyOptional({
    example: {
      type: "Point",
      coordinates: [-78.5001, -7.1637]
    }
  })
  @IsOptional()
  @IsObject({
    message: "visitLocation must be an object."
  })
  visitLocation?: {
    type: "Point";
    coordinates: [number, number];
  } | null;

  @ApiPropertyOptional({
    example: "2026-04-04T14:30:00.000Z"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString(
    {},
    {
      message: "synchronizedAt must be a valid ISO 8601 date string."
    }
  )
  synchronizedAt?: string | null;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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

function normalizeOptionalDecimal(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return String(value).trim();
}
