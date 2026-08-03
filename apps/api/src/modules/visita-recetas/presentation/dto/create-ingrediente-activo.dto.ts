import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateIngredienteActivoDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    format: "uuid",
    description: "UUID público del cliente para idempotencia de sincronización."
  })
  @IsOptional()
  @IsUUID("4")
  publicId?: string;

  @ApiProperty({
    example: "Azoxystrobin",
    description: "Nombre del ingrediente activo."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: "Fungicida sistémico del grupo de las estrobilurinas.",
    description: "Descripción opcional del ingrediente activo."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  description?: string | null;
}
