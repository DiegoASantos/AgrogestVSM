import { IsDateString, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindVisitasComercialesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_desde?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_hasta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  agronomo_usuario_id?: string;
}
