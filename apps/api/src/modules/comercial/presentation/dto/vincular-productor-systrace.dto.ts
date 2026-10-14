import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";

export class VincularProductorSystraceDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  codigoProductor!: string;

  @IsUUID("4")
  productorId!: string;

  @IsOptional()
  @IsBoolean()
  confirmarCorreccion?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmarInactivo?: boolean;
}
