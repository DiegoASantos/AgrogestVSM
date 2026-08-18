import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";

export class FitosanidadProductoDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({
    example: "plaga",
    description: "Tipo de objetivo: plaga o enfermedad."
  })
  @IsIn(["plaga", "enfermedad"])
  objetivo!: "plaga" | "enfermedad";

  @ApiProperty({ example: "Thrips", description: "Nombre de la plaga o enfermedad." })
  @IsString()
  @MaxLength(150)
  objetivoNombre!: string;

  @ApiPropertyOptional({
    example: "preventivo",
    description:
      "Enfoque de la recomendacion. Si se omite se interpreta como reactivo."
  })
  @IsOptional()
  @IsIn(["reactivo", "preventivo"])
  enfoque?: "reactivo" | "preventivo";

  @ApiPropertyOptional({
    example: 12,
    description: "Identificador de la plaga o enfermedad objetivo."
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  objetivoId?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Grado de incidencia conservado dentro de la receta."
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  incidenciaGrado?: number;

  @ApiPropertyOptional({
    example: 0,
    description: "Grado de severidad conservado dentro de la receta."
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  severidadGrado?: number;

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
  @MaxLength(50)
  disolvente?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  modoAccionId?: number;

  @ApiPropertyOptional({ example: "Abamectina" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  ingredienteActivoNombre?: string;

  @ApiPropertyOptional({
    example: 250,
    description: "Dosis de producto comercial en mg o mL por cilindro."
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dosisProducto?: number;

  @ApiPropertyOptional({
    example: "ml/cilindro",
    description:
      "Unidad elegida para la dosis comercial. La seleccion no convierte el valor numerico."
  })
  @IsOptional()
  @IsIn(["mg/cilindro", "g/cilindro", "kg/cilindro", "ml/cilindro", "l/cilindro"])
  unidadDosis?: string;

  @ApiPropertyOptional({ example: "Agrimec" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
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
}

export class LegacyFitosanidadDto extends FitosanidadProductoDto {
  @ApiProperty({ example: 1, description: "Numero de aplicacion legacy." })
  @IsInt()
  @Min(1)
  numero!: number;

  @ApiPropertyOptional({ example: 250, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dosisIa?: number;

  @ApiPropertyOptional({ example: 2, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumenAplicacion?: number;

  @ApiPropertyOptional({ example: 500, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidadTotalIa?: number;

  @ApiPropertyOptional({ example: "[1, 4]", deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  coadyuvantesIds?: string;

  @ApiPropertyOptional({
    example: '["Agua","Producto agroquimico"]',
    deprecated: true
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  ordenMezcla?: string;
}

export class MezclaDto {
  @ApiProperty({ example: 1, description: "Numero correlativo de la mezcla." })
  @IsInt()
  @Min(1)
  numero!: number;

  @ApiPropertyOptional({
    example: "[1, 4]",
    description: "JSON string de ids de coadyuvantes de la mezcla."
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  coadyuvantesIds?: string;

  @ApiPropertyOptional({
    example: '["Agua","Corrector de pH","Agrimec","Adherente"]',
    description: "JSON string con el orden de preparacion de la mezcla."
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  ordenMezcla?: string;

  @ApiPropertyOptional({
    example: 2,
    description: "Volumen de aplicacion expresado en cilindros por hectarea."
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumenAplicacion?: number;

  @ApiProperty({ example: 1.2, description: "Factor derivado de la incidencia." })
  @IsNumber()
  @Min(1)
  @Max(10)
  factor!: number;

  @ApiProperty({
    example: false,
    description: "Indica si el factor puede ajustarse por incidencia de grado 3."
  })
  @IsBoolean()
  factorEditable!: boolean;

  @ApiPropertyOptional({
    example: 600,
    description: "Cantidad total de producto comercial a aplicar por hectarea (mg o mL)."
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidadTotalProducto?: number;

  @ApiProperty({
    type: [FitosanidadProductoDto],
    description: "Productos comerciales que comparten el tanque."
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FitosanidadProductoDto)
  productos!: FitosanidadProductoDto[];
}

export class FertilizacionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({
    example: "12",
    description: "Nutriente objetivo. Se omite solo para recetas legacy."
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nutrienteId?: string;

  @ApiPropertyOptional({
    example: "preventivo",
    description:
      "Enfoque del producto fertilizante. Si se omite se interpreta como reactivo."
  })
  @IsOptional()
  @IsIn(["reactivo", "preventivo"])
  enfoque?: "reactivo" | "preventivo";

  @ApiProperty({
    example: "edafica",
    description: "Via de aplicacion: edafica o foliar."
  })
  @IsIn(["edafica", "foliar"])
  viaAplicacion!: "edafica" | "foliar";

  @ApiPropertyOptional({ example: "Nitrato de potasio" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
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
    example: "kg/planta",
    description:
      "Unidad de dosis seleccionada. Acepta unidades canonicas y valores legacy de clientes instalados."
  })
  @IsOptional()
  @IsIn([
    "mg/planta",
    "g/planta",
    "kg/planta",
    "ml/planta",
    "l/planta",
    "mg/cilindro",
    "g/cilindro",
    "kg/cilindro",
    "ml/cilindro",
    "l/cilindro",
    "Kg/planta",
    "L/planta",
    "Kg/cilindro",
    "L/cilindro"
  ])
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

  @ApiPropertyOptional({
    example: 1.2,
    description: "Factor derivado de la incidencia; usa 1 para clientes legacy."
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  factor?: number;
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
    "riego_pesado" | "riego_ligero" | "inicio_agoste" | "ruptura_agoste";
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
  @MaxLength(150)
  etapaFenologica?: string;

  @ApiPropertyOptional({ type: [MezclaDto], description: "Tanques de preparacion." })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MezclaDto)
  mezclas?: MezclaDto[];

  @ApiPropertyOptional({
    type: [LegacyFitosanidadDto],
    description: "Contrato plano temporal para clientes mobile anteriores.",
    deprecated: true
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LegacyFitosanidadDto)
  fitosanidad?: LegacyFitosanidadDto[];

  @ApiProperty({
    type: [FertilizacionDto],
    description: "Recomendaciones de fertilizacion."
  })
  @IsArray()
  @ArrayMaxSize(100)
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
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => LaborDto)
  labores!: LaborDto[];
}
