import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSectorDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    format: "uuid",
    description: "UUID público del cliente para idempotencia de sincronización."
  })
  @IsOptional()
  @IsUUID("4")
  publicId?: string;

  @ApiProperty({
    example: "1",
    description: "Id del distrito donde se encuentra el sector."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "distritoId must be a positive integer."
  })
  distritoId!: string;

  @ApiProperty({
    example: "Sector Norte"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: "Caserio o zona territorial."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  description?: string | null;

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

  const normalizedValue = String(value ?? "").trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}
