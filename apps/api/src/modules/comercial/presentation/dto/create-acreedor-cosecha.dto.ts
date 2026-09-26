import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";

import {
  PAGO_COSECHA_BANKS,
  PAGO_COSECHA_DOCUMENT_TYPES,
  type PagoCosechaBank,
  type PagoCosechaDocumentType
} from "../../infrastructure/persistence/entities/acreedor-cosecha.entity";

const clean = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "");

export class CreateAcreedorCosechaDto {
  @ApiProperty({ example: "1", description: "Id del productor asociado." })
  @Transform(({ value }) => clean(value))
  @Matches(/^[1-9]\d*$/, { message: "productorId must be a positive integer." })
  productorId!: string;

  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "UUID generado por mobile para reintentos idempotentes."
  })
  @IsOptional()
  @IsUUID("4")
  publicId?: string;

  @ApiProperty({ example: "Maria Elena", description: "Nombres del acreedor." })
  @Transform(({ value }) => String(value ?? "").trim())
  @IsString()
  @Matches(/\S/, { message: "creditorFirstName should not be empty." })
  @MaxLength(100)
  creditorFirstName!: string;

  @ApiProperty({ example: "Perez Lopez", description: "Apellidos del acreedor." })
  @Transform(({ value }) => String(value ?? "").trim())
  @IsString()
  @Matches(/\S/, { message: "creditorLastName should not be empty." })
  @MaxLength(100)
  creditorLastName!: string;

  @ApiProperty({ enum: PAGO_COSECHA_DOCUMENT_TYPES, example: "DNI", description: "Tipo de documento." })
  @IsIn(PAGO_COSECHA_DOCUMENT_TYPES)
  creditorDocumentType!: PagoCosechaDocumentType;

  @ApiProperty({ example: "12345678", description: "Numero de documento sin espacios." })
  @Transform(({ value }) => clean(value))
  @Matches(/^\d{8}$|^\d{11}$/)
  creditorDocumentNumber!: string;

  @ApiProperty({ enum: PAGO_COSECHA_BANKS, example: "BCP", description: "Banco de abono." })
  @IsIn(PAGO_COSECHA_BANKS)
  bank!: PagoCosechaBank;

  @ApiProperty({ example: "1912345678901234567890", description: "Numero de cuenta o CCI." })
  @Transform(({ value }) => clean(value))
  @Matches(/^\d{1,30}$/)
  accountNumber!: string;
}
