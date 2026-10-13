import { IsString, Matches, MaxLength } from "class-validator";

export class MarcarVisitaDuplicadaLeidaDto {
  @IsString()
  @MaxLength(19)
  @Matches(/^[1-9]\d*$/)
  productorId!: string;

  @IsString()
  @MaxLength(19)
  @Matches(/^[1-9]\d*$/)
  agronomoUsuarioId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaVisita!: string;
}
