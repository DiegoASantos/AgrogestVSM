import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVisitaRecomendacionDto {
  @ApiProperty({
    example: "1",
    description: "Id del tipo de recomendacion."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "recommendationTypeId must be a positive integer."
  })
  recommendationTypeId!: string;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  applies?: boolean;

  @ApiPropertyOptional({
    example: "Aplicar riego ligero y monitoreo cada 3 dias."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  detail?: string | null;
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
