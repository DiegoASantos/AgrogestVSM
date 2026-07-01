import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateParcelaDto {
  @ApiProperty({
    example: "1",
    description: "Id del productor propietario."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "productorId must be a positive integer."
  })
  productorId!: string;

  @ApiProperty({
    example: "1",
    description: "Id del subsector asociado."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "subsectorId must be a positive integer."
  })
  subsectorId!: string;

  @ApiPropertyOptional({
    example: "PAR-001",
    description:
      "Codigo de parcela. La API lo genera automaticamente al crear una parcela."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @Matches(/\S/, {
    message: "code should not be empty."
  })
  @MaxLength(30)
  code?: string | null;

  @ApiPropertyOptional({
    example: "Parcela Norte"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string | null;

  @ApiPropertyOptional({
    example: "12.5000",
    description: "Area en hectareas. Debe ser mayor que cero."
  })
  @Transform(({ value }) => normalizeOptionalDecimal(value))
  @IsOptional()
  @Matches(/^\d+(\.\d+)?$/, {
    message: "areaHectares must be a positive decimal number."
  })
  areaHectares?: string | null;

  @ApiPropertyOptional({
    example: "Lote principal"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: {
      type: "Point",
      coordinates: [-78.5001, -7.1637]
    },
    description: "GeoJSON Point en SRID 4326."
  })
  @IsOptional()
  @IsObject()
  referencePoint?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    example: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-78.5002, -7.1638],
            [-78.4995, -7.1638],
            [-78.4995, -7.1632],
            [-78.5002, -7.1632],
            [-78.5002, -7.1638]
          ]
        ]
      ]
    },
    description: "GeoJSON MultiPolygon en SRID 4326."
  })
  @IsOptional()
  @IsObject()
  geometry?: Record<string, unknown> | null;

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

function normalizeOptionalDecimal(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return String(value).trim();
}
