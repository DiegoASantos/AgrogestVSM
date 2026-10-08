import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested
} from "class-validator";
import {
  CreateDetallePagoProductorDto,
  UpdateDetallePagoProductorDto
} from "./create-detalle-pago-productor.dto";

export class GuardarDetallesPagoProductorDto {
  @ApiProperty({ type: [CreateDetallePagoProductorDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateDetallePagoProductorDto)
  crear!: CreateDetallePagoProductorDto[];

  @ApiProperty({ type: [UpdateDetallePagoProductorDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ActualizarDetallePagoProductorDto)
  actualizar!: ActualizarDetallePagoProductorDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  anularIds?: string[];
}

export class ActualizarDetallePagoProductorDto extends UpdateDetallePagoProductorDto {
  @ApiProperty()
  @IsUUID("4")
  id!: string;
}
