import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";

const clean = ({ value }: { value: unknown }) =>
  value == null ? value : String(value).trim();
const decimal = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;
const price = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,6})?$/;
const weightPercentage = /^(?:(?:[1-9]\d?)(?:\.\d{1,2})?|100(?:\.0{1,2})?|0\.(?:0[1-9]|[1-9]\d?))$/;
const discountTypes = ["NO_APLICA", "CLP", "INSUMOS", "COMISION", "ANTICIPO"] as const;
const detailStatuses = ["PENDIENTE", "OBSERVADO", "PAGADO"] as const;

export class CreateDetallePagoProductorDto {
  @ApiProperty({ description: "UUID público de un acreedor aprobado del productor." })
  @Transform(clean)
  @IsUUID("4")
  acreedorId!: string;
  @ApiPropertyOptional({
    example: "DNI",
    description: "Compatibilidad con el nombre histórico."
  })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @Matches(/^(DNI|RUC)$/)
  tipoDocumentoProductor!: string;
  @ApiPropertyOptional({ description: "Compatibilidad con el nombre histórico." })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @Matches(/^\d{8,20}$/)
  @MaxLength(20)
  nroDocumentoProductor!: string;
  @ApiPropertyOptional({ description: "Alias semántico para nuevas integraciones." })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @Matches(/^(DNI|RUC)$/)
  tipoDocumentoAcreedor?: string;
  @ApiPropertyOptional({ description: "Alias semántico para nuevas integraciones." })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @Matches(/^\d{8,20}$/)
  @MaxLength(20)
  nroDocumentoAcreedor?: string;
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidadJabas!: number;
  @ApiProperty()
  @Transform(clean)
  @Matches(price)
  precioJaba!: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(price)
  precioKilo!: string;
  @ApiPropertyOptional({ enum: ["JABA", "KILO"] })
  @IsOptional()
  @IsIn(["JABA", "KILO"])
  precioBase?: "JABA" | "KILO";
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
  @ApiPropertyOptional({ description: "Calculado por el servidor; aceptado por compatibilidad." })
  @IsOptional()
  @Transform(clean)
  @Matches(price)
  subTotal?: string;
  @ApiPropertyOptional({ enum: discountTypes })
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
  @ApiPropertyOptional({ description: "Calculado por el servidor; aceptado por compatibilidad." })
  @IsOptional()
  @Transform(clean)
  @Matches(decimal)
  totalPostDescuento?: string;
  @ApiProperty()
  @Transform(clean)
  @Matches(decimal)
  detraccion!: string;
  @ApiPropertyOptional({ description: "Calculado por el servidor; aceptado por compatibilidad." })
  @IsOptional()
  @Transform(clean)
  @Matches(decimal)
  totalPostDetraccion?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(50)
  nroLiquidacion?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(300)
  observacion?: string;
  @ApiPropertyOptional({ enum: detailStatuses })
  @IsOptional()
  @IsIn(detailStatuses)
  estado?: (typeof detailStatuses)[number];
  @ApiPropertyOptional({ example: "2026-10-14" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaPago?: string | null;
}

export class UpdateDetallePagoProductorDto extends CreateDetallePagoProductorDto {}
