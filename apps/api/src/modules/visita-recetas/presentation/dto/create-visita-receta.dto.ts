import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

export class FitosanidadDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({ example: 1, description: "Numero de aplicacion (01, 02...)." })
  @IsInt()
  @Min(1)
  numero!: number;

  @ApiProperty({
    example: "plaga",
    description: "Tipo de objetivo: plaga o enfermedad."
  })
  @IsIn(["plaga", "enfermedad"])
  objetivo!: "plaga" | "enfermedad";

  @ApiProperty({ example: "Thrips", description: "Nombre de la plaga o enfermedad." })
  @IsString()
  objetivoNombre!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tipoControlId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tipoProductoId?: number;

  @ApiPropertyOptional({ example: "Agua" })
  @IsOptional()
  @IsString()
  disolvente?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  modoAccionId?: number;

  @ApiPropertyOptional({ example: "Abamectina" })
  @IsOptional()
  @IsString()
  ingredienteActivoNombre?: string;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dosisIa?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumenAplicacion?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidadTotalIa?: number;

  @ApiPropertyOptional({ example: "Agrimec" })
  @IsOptional()
  @IsString()
  marcaProductoNombre?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  concentracionProducto?: number;

  @ApiPropertyOptional({ example: 27.78 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidadTotalProducto?: number;

  @ApiPropertyOptional({
    example: "[1, 4]",
    description: "JSON string de ids de coadyuvantes seleccionados."
  })
  @IsOptional()
  @IsString()
  coadyuvantesIds?: string;

  @ApiPropertyOptional({
    example: '["Agua","Regulador de pH","Producto agroquimico","Adherente"]'
  })
  @IsOptional()
  @IsString()
  ordenMezcla?: string;
}

export class FertilizacionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({
    example: "edafica",
    description: "Via de aplicacion: edafica o foliar."
  })
  @IsIn(["edafica", "foliar"])
  viaAplicacion!: "edafica" | "foliar";

  @ApiPropertyOptional({ example: "Nitrato de potasio" })
  @IsOptional()
  @IsString()
  fertilizanteNombre?: string;

  @ApiPropertyOptional({
    example: "solido",
    description: "Tipo de producto: solido o liquido."
  })
  @IsOptional()
  @IsIn(["solido", "liquido"])
  tipoProducto?: "solido" | "liquido";

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dosis?: number;

  @ApiPropertyOptional({
    example: "Kg/planta",
    description: "Unidad de dosis (Kg/planta, L/planta, Kg/cilindro, L/cilindro)."
  })
  @IsOptional()
  @IsString()
  unidadDosis?: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadTotalPlantas?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumenAplicacion?: number;

  @ApiPropertyOptional({ example: 750 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidadTotalFertilizante?: number;
}

export class RiegoDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({
    example: "riego_pesado",
    description: "Tipo de recomendacion de riego."
  })
  @IsIn(["riego_pesado", "riego_ligero", "inicio_agoste", "ruptura_agoste"])
  tipoRecomendacion!:
    | "riego_pesado"
    | "riego_ligero"
    | "inicio_agoste"
    | "ruptura_agoste";
}

export class LaborDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({
    example: "horqueteo",
    description: "Tipo de labor recomendada."
  })
  @IsIn([
    "limpieza_maleza_pala",
    "limpieza_maleza_motoguadana",
    "horqueteo",
    "enzunchado",
    "recoleccion_frutos",
    "trampas_mosca"
  ])
  labor!:
    | "limpieza_maleza_pala"
    | "limpieza_maleza_motoguadana"
    | "horqueteo"
    | "enzunchado"
    | "recoleccion_frutos"
    | "trampas_mosca";
}

export class CreateVisitaRecetaDto {
  @ApiPropertyOptional({
    example: "Floracion (45%)",
    description: "Etapa fenologica consolidada de la visita."
  })
  @IsOptional()
  @IsString()
  etapaFenologica?: string;

  @ApiProperty({
    type: [FitosanidadDto],
    description: "Aplicaciones fitosanitarias."
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FitosanidadDto)
  fitosanidad!: FitosanidadDto[];

  @ApiProperty({
    type: [FertilizacionDto],
    description: "Recomendaciones de fertilizacion."
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FertilizacionDto)
  fertilizacion!: FertilizacionDto[];

  @ApiPropertyOptional({
    type: RiegoDto,
    description: "Recomendacion de riego (nulo si no se selecciona)."
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RiegoDto)
  riego?: RiegoDto;

  @ApiProperty({
    type: [LaborDto],
    description: "Recomendaciones de labores."
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaborDto)
  labores!: LaborDto[];
}
