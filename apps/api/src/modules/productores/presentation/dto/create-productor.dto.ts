import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import {
  PRODUCTOR_ENTITY_TYPES,
  type ProductorEntityType
} from "../../infrastructure/persistence/entities/productor.entity";

export class CreateProductorDto {
  @ApiPropertyOptional({
    example: "persona",
    default: "persona",
    enum: PRODUCTOR_ENTITY_TYPES,
    description: "Tipo de entidad del productor."
  })
  @IsOptional()
  @IsIn(PRODUCTOR_ENTITY_TYPES)
  entityType?: ProductorEntityType;

  @ApiPropertyOptional({
    example: 1,
    description: "Id del tipo de documento existente."
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  documentTypeId?: number | null;

  @ApiPropertyOptional({
    example: "12345678",
    description: "Numero de documento del productor."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  documentNumber?: string | null;

  @ApiPropertyOptional({
    example: "Juan"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string | null;

  @ApiPropertyOptional({
    example: "Perez"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @ValidateIf(isPersonEntity)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string | null;

  @ApiPropertyOptional({
    example: "999888777"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({
    example: "productor@agrogest.com"
  })
  @Transform(({ value }) => trimOptionalEmail(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;

  @ApiPropertyOptional({
    example: "Av. Principal 123"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  address?: string | null;

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

function isPersonEntity(value: CreateProductorDto): boolean {
  return value.entityType === undefined || value.entityType === "persona";
}

function trimOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = String(value ?? "").trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function trimOptionalEmail(value: unknown): string | null | undefined {
  const normalizedValue = trimOptionalString(value);

  return typeof normalizedValue === "string"
    ? normalizedValue.toLowerCase()
    : normalizedValue;
}
