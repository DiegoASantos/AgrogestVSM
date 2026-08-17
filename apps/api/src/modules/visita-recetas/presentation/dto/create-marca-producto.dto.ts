import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMarcaProductoDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    format: "uuid",
    description: "UUID público del cliente para idempotencia de sincronización."
  })
  @IsOptional()
  @IsUUID("4")
  publicId?: string;

  @ApiProperty({
    example: "Amistar Top",
    description: "Nombre comercial del producto."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: "1",
    description: "ID del tipo de producto fitosanitario (obligatorio)."
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : String(value ?? "")
  )
  @Matches(/^[1-9]\d*$/, {
    message: "tipoProductoId must be a positive integer."
  })
  tipoProductoId!: string;

  @ApiPropertyOptional({
    example: "1",
    description: "ID del ingrediente activo asociado."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "ingredienteActivoId must be a positive integer."
  })
  ingredienteActivoId?: string | null;

  @ApiPropertyOptional({
    example: "325",
    description: "Concentración del producto."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  concentracion?: string | null;

  @ApiPropertyOptional({
    example: "g/L",
    description: "Unidad de medida de la concentración."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string | null;
}
