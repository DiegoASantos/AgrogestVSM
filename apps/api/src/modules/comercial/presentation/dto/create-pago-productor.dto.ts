import { Transform, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";

const clean = ({ value }: { value: unknown }) =>
  value == null ? value : String(value).trim();
const decimal = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

export class CreatePagoProductorDto {
  @ApiProperty({ description: "UUID público del productor." })
  @Transform(clean)
  @IsUUID("4")
  productorId!: string;

  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  sistemaOrigen!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  nroGuia!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  lote!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(10)
  protocolo!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  variedad!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  tipoCultivo!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(50)
  categoria!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  destino!: string;
  @ApiProperty({ example: "2026-10-01" })
  @Transform(clean)
  @IsDateString()
  fechaCosecha!: string;
  @ApiProperty({ example: "2026-10-02" })
  @Transform(clean)
  @IsDateString()
  fechaRecepcion!: string;
  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  jabas!: number;
  @ApiProperty({ example: "1250.00" })
  @Transform(clean)
  @Matches(decimal)
  pesoBruto!: string;
  @ApiProperty({ example: "50.00" })
  @Transform(clean)
  @Matches(decimal)
  pesoTara!: string;
  @ApiProperty({ example: "1200.00" })
  @Transform(clean)
  @Matches(decimal)
  pesoNeto!: string;
  @ApiProperty({ example: "12.00" })
  @Transform(clean)
  @Matches(decimal)
  pesoPromedio!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(10)
  exportador!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  codigoProductorOrigen!: string;
  @ApiProperty()
  @Transform(clean)
  @IsString()
  @Matches(/\S/)
  @MaxLength(250)
  nombreProductorOrigen!: string;
}
