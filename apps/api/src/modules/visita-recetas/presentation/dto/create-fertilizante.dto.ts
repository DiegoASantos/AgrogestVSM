import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFertilizanteDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    format: "uuid",
    description: "UUID público del cliente para idempotencia de sincronización."
  })
  @IsOptional()
  @IsUUID("4")
  publicId?: string;

  @ApiProperty({
    example: "Nitrato de Potasio",
    description: "Nombre del fertilizante."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: "solido",
    enum: ["solido", "liquido"],
    description: "Tipo de fertilizante."
  })
  @IsString()
  @IsIn(["solido", "liquido"])
  tipo!: string;

  @ApiPropertyOptional({
    example: "46",
    description: "Concentración del fertilizante."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  concentracion?: string | null;

  @ApiPropertyOptional({
    example: "%",
    description: "Unidad de medida de la concentración."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string | null;
}
