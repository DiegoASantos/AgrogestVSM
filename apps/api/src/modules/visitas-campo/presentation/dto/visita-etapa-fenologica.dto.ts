import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, Matches, Max, Min } from "class-validator";

export class VisitaEtapaFenologicaDto {
  @ApiProperty({ example: "1" })
  @Transform(({ value }) => String(value ?? "").trim())
  @Matches(/^[1-9]\d*$/)
  phenologicalStageId!: string;

  @ApiPropertyOptional({ example: "2" })
  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  subEtapaId?: string | null;

  @ApiPropertyOptional({ example: 60, description: "Porcentaje entero de la parcela para una Etapa." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  coveragePercentage?: number | null;

  @ApiPropertyOptional({ example: 50, description: "Avance de una Labor, si corresponde." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  laborProgressPercentage?: number | null;
}
