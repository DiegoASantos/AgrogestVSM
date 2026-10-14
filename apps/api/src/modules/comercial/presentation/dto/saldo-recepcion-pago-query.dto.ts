import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";

const clean = ({ value }: { value: unknown }) => String(value ?? "").trim();

export class SaldoRecepcionPagoQueryDto {
  @Transform(clean)
  @IsString()
  @MaxLength(150)
  @Matches(/\S/)
  sistemaOrigen!: string;

  @Transform(clean)
  @IsString()
  @MaxLength(150)
  @Matches(/\S/)
  codigoProductorOrigen!: string;

  @Transform(clean)
  @IsString()
  @MaxLength(150)
  @Matches(/\S/)
  nroGuia!: string;

  @Transform(clean)
  @IsString()
  @MaxLength(150)
  @Matches(/\S/)
  lote!: string;

  @Transform(clean)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaRecepcion!: string;
}
