import { IsIn, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ExportVisitasExcelQueryDto } from "../../../visitas-campo/presentation/dto/export-visitas-excel-query.dto";

export class ExportVisitasComercialesQueryDto extends ExportVisitasExcelQueryDto {
  @ApiPropertyOptional({ enum: ["GENERAL", "TECNICA", "COMERCIAL"] })
  @IsOptional()
  @IsIn(["GENERAL", "TECNICA", "COMERCIAL"])
  tipo?: "GENERAL" | "TECNICA" | "COMERCIAL";
}
