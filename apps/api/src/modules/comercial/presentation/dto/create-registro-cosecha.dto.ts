import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

const clean = (value: unknown) => String(value ?? "").trim();

export class CreateRegistroCosechaDto {
  @ApiProperty({ example: "1", description: "Id del productor asociado." })
  @Transform(({ value }) => clean(value))
  @Matches(/^[1-9]\d*$/, { message: "productorId must be a positive integer." })
  productorId!: string;

  @ApiProperty({ example: "2", description: "Id del acreedor seleccionado." })
  @Transform(({ value }) => clean(value))
  @Matches(/^[1-9]\d*$/, { message: "creditorId must be a positive integer." })
  creditorId!: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID generado por mobile para reintentos idempotentes."
  })
  @IsOptional()
  @IsUUID("4")
  publicId?: string;

  @ApiProperty({ example: 120, description: "Cantidad de jabas enteras." })
  @Transform(({ value }) => clean(value))
  @Matches(/^[1-9]\d*$/, { message: "crateQuantity must be a positive integer." })
  crateQuantity!: string;

  @ApiProperty({ example: "12.50", description: "Precio de jaba en PEN con hasta dos decimales." })
  @Transform(({ value }) => clean(value).replace(",", "."))
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, {
    message: "cratePrice must be a decimal with at most two decimals."
  })
  cratePrice!: string;

  @ApiProperty({ example: "2026-09-24", description: "Fecha actual de registro en formato YYYY-MM-DD." })
  @Transform(({ value }) => clean(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  registrationDate!: string;

  @ApiProperty({ example: "2026-09-23", description: "Fecha de cosecha en formato YYYY-MM-DD." })
  @Transform(({ value }) => clean(value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  harvestDate!: string;
}
