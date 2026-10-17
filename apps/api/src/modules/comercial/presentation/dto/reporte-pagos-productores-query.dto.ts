import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class ReportePagosProductoresQueryDto {
  @ApiPropertyOptional({ description: "UUID público del productor." })
  @IsOptional()
  @IsUUID()
  productorId?: string;

  @ApiPropertyOptional({ name: "fecha_desde", example: "2026-10-01" })
  @IsOptional()
  @IsDateString({}, { message: "fecha_desde debe ser una fecha ISO válida." })
  fecha_desde?: string;

  @ApiPropertyOptional({ name: "fecha_hasta", example: "2026-10-31" })
  @IsOptional()
  @IsDateString({}, { message: "fecha_hasta debe ser una fecha ISO válida." })
  fecha_hasta?: string;
}
