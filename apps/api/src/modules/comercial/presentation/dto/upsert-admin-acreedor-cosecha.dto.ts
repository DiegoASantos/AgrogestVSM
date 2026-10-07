import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsString, Matches, MaxLength, IsUUID } from "class-validator";
import {
  PAGO_COSECHA_BANKS,
  PAGO_COSECHA_DOCUMENT_TYPES,
  type PagoCosechaBank,
  type PagoCosechaDocumentType
} from "../../infrastructure/persistence/entities/acreedor-cosecha.entity";

const clean = ({ value }: { value: unknown }) =>
  value == null ? value : String(value).trim();

export class CreateAdminAcreedorCosechaDto {
  @ApiProperty({ description: "UUID público del productor." })
  @Transform(clean)
  @IsUUID("4")
  productorId!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  nombres!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  apellidos!: string;
  @ApiProperty({ enum: PAGO_COSECHA_DOCUMENT_TYPES })
  @IsIn(PAGO_COSECHA_DOCUMENT_TYPES)
  tipoDocumento!: PagoCosechaDocumentType;
  @ApiProperty()
  @Transform(clean)
  @Matches(/^\d{8}$|^\d{11}$/)
  nroDocumento!: string;
  @ApiProperty({ enum: PAGO_COSECHA_BANKS })
  @IsIn(PAGO_COSECHA_BANKS)
  banco!: PagoCosechaBank;
  @ApiProperty()
  @Transform(clean)
  @Matches(/^\d{1,30}$/)
  nroCuenta!: string;
}

export class UpdateAdminAcreedorCosechaDto extends PartialType(
  CreateAdminAcreedorCosechaDto
) {}
