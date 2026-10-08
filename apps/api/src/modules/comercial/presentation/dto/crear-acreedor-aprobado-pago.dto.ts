import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsString, Matches, MaxLength } from "class-validator";
import {
  PAGO_COSECHA_BANKS,
  PAGO_COSECHA_DOCUMENT_TYPES
} from "../../infrastructure/persistence/entities/acreedor-cosecha.entity";

const clean = ({ value }: { value: unknown }) =>
  value == null ? value : String(value).trim();

export class CrearAcreedorAprobadoPagoDto {
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
  tipoDocumento!: (typeof PAGO_COSECHA_DOCUMENT_TYPES)[number];
  @ApiProperty()
  @Transform(clean)
  @Matches(/^\d{8}$|^\d{11}$/)
  nroDocumento!: string;
  @ApiProperty({ enum: PAGO_COSECHA_BANKS })
  @IsIn(PAGO_COSECHA_BANKS)
  banco!: (typeof PAGO_COSECHA_BANKS)[number];
  @ApiProperty()
  @Transform(clean)
  @Matches(/^\d{1,30}$/)
  nroCuenta!: string;
}
