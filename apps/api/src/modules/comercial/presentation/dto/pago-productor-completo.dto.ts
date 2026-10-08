import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested
} from "class-validator";
import { CreatePagoProductorDto } from "./create-pago-productor.dto";
import { UpdatePagoProductorDto } from "./update-pago-productor.dto";
import {
  CreateDetallePagoProductorDto,
  UpdateDetallePagoProductorDto
} from "./create-detalle-pago-productor.dto";

export class DetallePagoCompletoDto extends UpdateDetallePagoProductorDto {
  @ApiPropertyOptional({ description: "UUID público del detalle existente." })
  @IsOptional()
  @IsUUID("4")
  id?: string;
}

export class CrearPagoCompletoDto {
  @ApiProperty({ type: CreatePagoProductorDto })
  @ValidateNested()
  @Type(() => CreatePagoProductorDto)
  cabecera!: CreatePagoProductorDto;

  @ApiProperty({ type: [CreateDetallePagoProductorDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateDetallePagoProductorDto)
  detalles!: CreateDetallePagoProductorDto[];
}

export class EditarPagoCompletoDto {
  @ApiProperty({ type: UpdatePagoProductorDto })
  @ValidateNested()
  @Type(() => UpdatePagoProductorDto)
  cabecera!: UpdatePagoProductorDto;

  @ApiProperty({ type: [DetallePagoCompletoDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DetallePagoCompletoDto)
  detalles!: DetallePagoCompletoDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID("4", { each: true })
  anularIds?: string[];
}
