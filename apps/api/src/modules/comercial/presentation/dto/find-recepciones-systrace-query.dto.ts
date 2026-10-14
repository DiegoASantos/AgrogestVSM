import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindRecepcionesSystraceQueryDto extends PaginationQueryDto {
  @IsDateString()
  fechaRecepcion!: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MaxLength(150)
  codigoProductor?: string;
}
