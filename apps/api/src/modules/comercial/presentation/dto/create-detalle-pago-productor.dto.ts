import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";
import {
  PAGO_PRODUCTOR_STATUSES,
  type PagoProductorStatus
} from "../../infrastructure/persistence/entities/pago-productor.entity";

const clean = ({ value }: { value: unknown }) =>
  value == null ? value : String(value).trim();
const decimal = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;
const weightPercentage = /^(?:(?:0|[1-9]\d?)(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/;

export class CreateDetallePagoProductorDto {
  @ApiProperty({ description: "UUID público de un acreedor aprobado del productor." })
  @Transform(clean)
  @IsUUID("4")
  acreedorId!: string;
  @ApiProperty({ example: "DNI" })
  @Transform(clean)
  @IsString()
  @Matches(/^(DNI|RUC)$/)
  tipoDocumentoProductor!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/^\d{8,20}$/)
  @MaxLength(20)
  nroDocumentoProductor!: string;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  cantidadJabas!: number;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  precioJaba!: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  precioKilo!: string;
  @ApiProperty({ example: "100.00" })
  @Transform(clean)
  @Matches(weightPercentage)
  porcentajePeso!: string;
  @ApiProperty()
  @IsBoolean()
  aplicaFairtrade!: boolean;
  @ApiProperty({ description: "UUID público del supervisor." })
  @Transform(clean)
  @IsUUID("4")
  supervisorId!: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  subTotal!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(200)
  tipoDescuento?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(clean)
  @Matches(decimal)
  montoDescuento?: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  totalPostDescuento!: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  detraccion!: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  totalPostDetraccion!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(50)
  nroLiquidacion?: string | null;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(300)
  observacion!: string;
}

export class UpdateDetallePagoProductorDto extends CreateDetallePagoProductorDto {
  @ApiPropertyOptional({ enum: PAGO_PRODUCTOR_STATUSES })
  @IsOptional()
  @IsIn(PAGO_PRODUCTOR_STATUSES)
  estado?: PagoProductorStatus;
}
