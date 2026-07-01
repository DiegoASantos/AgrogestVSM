import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateSubsectorDto {
  @ApiProperty({
    example: "1",
    description: "Id del sector al que pertenece el subsector."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "sectorId must be a positive integer."
  })
  sectorId!: string;

  @ApiProperty({
    example: "Norte",
    description: "Nombre del subsector."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @Matches(/\S/, {
    message: "name should not be empty."
  })
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: "Zona norte del sector.",
    description: "Descripcion opcional del subsector."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: "Estado activo del subsector."
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
