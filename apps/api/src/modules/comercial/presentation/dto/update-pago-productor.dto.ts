import { PartialType } from "@nestjs/mapped-types";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CreatePagoProductorDto } from "./create-pago-productor.dto";
import {
  PAGO_PRODUCTOR_STATUSES,
  type PagoProductorStatus
} from "../../infrastructure/persistence/entities/pago-productor.entity";

export class UpdatePagoProductorDto extends PartialType(CreatePagoProductorDto) {
  @ApiPropertyOptional({ enum: PAGO_PRODUCTOR_STATUSES })
  @IsOptional()
  @IsIn(PAGO_PRODUCTOR_STATUSES)
  estado?: PagoProductorStatus;
}
