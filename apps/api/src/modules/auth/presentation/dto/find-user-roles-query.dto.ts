import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

export class FindUserRolesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    name: "usuario_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "usuario_id must be a positive integer."
  })
  usuario_id?: string;

  @ApiPropertyOptional({
    name: "rol_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "rol_id must be a positive integer."
  })
  rol_id?: string;
}
