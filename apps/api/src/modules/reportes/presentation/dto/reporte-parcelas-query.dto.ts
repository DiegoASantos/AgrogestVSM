import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ReporteParcelasQueryDto {
  @ApiPropertyOptional({
    name: "agronomo_usuario_id",
    example: "7",
    description: "Filtra por el agrónomo asignado actualmente a la parcela."
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "agronomo_usuario_id must be a positive integer."
  })
  agronomo_usuario_id?: string;

  @ApiPropertyOptional({
    name: "productor_id",
    example: "15",
    description: "Filtra por el productor propietario de la parcela."
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "productor_id must be a positive integer."
  })
  productor_id?: string;

  @ApiPropertyOptional({
    name: "sector_id",
    example: "2",
    description: "Filtra por el sector de la parcela."
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "sector_id must be a positive integer."
  })
  sector_id?: string;

  @ApiPropertyOptional({
    name: "subsector_id",
    example: "3",
    description: "Filtra por el subsector de la parcela."
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "subsector_id must be a positive integer."
  })
  subsector_id?: string;

  @ApiPropertyOptional({
    name: "activo",
    example: true,
    description: "Filtra parcelas activas o inactivas; omitido considera todas."
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({ message: "activo must be a boolean." })
  activo?: boolean;
}

function trimOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function parseOptionalBoolean(value: unknown): boolean | undefined | unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return value;
}
