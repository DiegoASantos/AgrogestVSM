import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateVisitaProductoRecomendadoDto {
  @ApiProperty({
    example: "1",
    description: "Id del producto recomendado."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "productId must be a positive integer."
  })
  productId!: string;

  @ApiProperty({
    example: "250 ml / 200 L"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @MaxLength(50)
  dose!: string;

  @ApiPropertyOptional({
    example: "1",
    description: "Id de la frecuencia de aplicacion."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "applicationFrequencyId must be a positive integer."
  })
  applicationFrequencyId?: string | null;

  @ApiPropertyOptional({
    example: "Aplicar en horas de baja radiacion."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string | null;
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
