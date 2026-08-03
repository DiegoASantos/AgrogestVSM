import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { CoadyuvanteEntity } from "../infrastructure/persistence/entities/coadyuvante.entity";
import { IngredienteActivoEntity } from "../infrastructure/persistence/entities/ingrediente-activo.entity";
import { MarcaProductoEntity } from "../infrastructure/persistence/entities/marca-producto.entity";
import { ModoAccionEntity } from "../infrastructure/persistence/entities/modo-accion.entity";
import { TipoControlEntity } from "../infrastructure/persistence/entities/tipo-control.entity";
import { TipoProductoFitosanitarioEntity } from "../infrastructure/persistence/entities/tipo-producto-fitosanitario.entity";
import { FertilizanteEntity } from "../infrastructure/persistence/entities/fertilizante.entity";
import { CreateIngredienteActivoDto } from "./dto/create-ingrediente-activo.dto";
import { UpdateIngredienteActivoDto } from "./dto/update-ingrediente-activo.dto";
import { CreateFertilizanteDto } from "./dto/create-fertilizante.dto";
import { UpdateFertilizanteDto } from "./dto/update-fertilizante.dto";
import { CreateMarcaProductoDto } from "./dto/create-marca-producto.dto";
import { UpdateMarcaProductoDto } from "./dto/update-marca-producto.dto";

function toLegacyNumericConcentration(value: string | null) {
  const normalized = value?.trim().replace(",", ".") ?? "";
  if (!/^\d+(?:\.\d+)?$/u.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIngredienteResponse(item: IngredienteActivoEntity) {
  return { id: item.id, publicId: item.publicId, name: item.name, description: item.description };
}

function toFertilizanteResponse(item: FertilizanteEntity) {
  return {
    id: item.id,
    publicId: item.publicId,
    name: item.name,
    type: item.type,
    concentracion: item.concentracion,
    unidadMedida: item.unidadMedida
  };
}

function toMarcaResponse(item: MarcaProductoEntity) {
  return {
    id: item.id,
    publicId: item.publicId,
    name: item.name,
    tipoProductoId: item.tipoProductoId,
    ingredienteActivoId: item.ingredienteActivoId,
    ingredienteActivoNombre: item.ingredienteActivo?.name ?? null,
    concentracion: toLegacyNumericConcentration(item.concentracion),
    concentracionTexto: item.concentracion,
    unidadMedida: item.unidadMedida
  };
}

@ApiTags("Catalogos de receta")
@Controller()
export class RecetasCatalogosController {
  constructor(
    @InjectRepository(CoadyuvanteEntity)
    private readonly coadyuvanteRepo: Repository<CoadyuvanteEntity>,
    @InjectRepository(IngredienteActivoEntity)
    private readonly ingredienteActivoRepo: Repository<IngredienteActivoEntity>,
    @InjectRepository(MarcaProductoEntity)
    private readonly marcaProductoRepo: Repository<MarcaProductoEntity>,
    @InjectRepository(ModoAccionEntity)
    private readonly modoAccionRepo: Repository<ModoAccionEntity>,
    @InjectRepository(TipoControlEntity)
    private readonly tipoControlRepo: Repository<TipoControlEntity>,
    @InjectRepository(TipoProductoFitosanitarioEntity)
    private readonly tipoProductoRepo: Repository<TipoProductoFitosanitarioEntity>,
    @InjectRepository(FertilizanteEntity)
    private readonly fertilizanteRepo: Repository<FertilizanteEntity>
  ) {}

  // ─── GET (read-only, existentes) ──────────────────────────

  @Get("coadyuvantes")
  @ApiOperation({ summary: "Lista todos los coadyuvantes." })
  @ApiOkResponse({ description: "Lista de coadyuvantes." })
  async getCoadyuvantes() {
    const items = await this.coadyuvanteRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({ id: i.id, name: i.name, description: i.description }))
    );
  }

  // ─── Ingredientes Activos ─────────────────────────────────

  @Get("ingredientes-activos")
  @ApiOperation({ summary: "Lista todos los ingredientes activos." })
  @ApiOkResponse({ description: "Lista de ingredientes activos." })
  async getIngredientesActivos() {
    const items = await this.ingredienteActivoRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(items.map(toIngredienteResponse));
  }

  @Post("ingredientes-activos")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOperation({ summary: "Crea un nuevo ingrediente activo." })
  @ApiCreatedResponse({ description: "Ingrediente activo creado." })
  async createIngredienteActivo(@Body() dto: CreateIngredienteActivoDto) {
    if (dto.publicId) {
      const existing = await this.ingredienteActivoRepo.findOne({
        where: { publicId: dto.publicId }
      });
      if (existing) {
        return createSuccessResponse(toIngredienteResponse(existing));
      }
    }

    const entity = this.ingredienteActivoRepo.create({
      name: dto.name,
      description: dto.description ?? null
    });

    const saved = await this.ingredienteActivoRepo.save(entity);

    return createSuccessResponse(toIngredienteResponse(saved));
  }

  @Patch("ingredientes-activos/:id")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOperation({ summary: "Actualiza un ingrediente activo." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Ingrediente activo actualizado." })
  async updateIngredienteActivo(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() dto: UpdateIngredienteActivoDto
  ) {
    const entity = await this.ingredienteActivoRepo.findOneOrFail({ where: { id } });

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined) entity.description = dto.description ?? null;

    const saved = await this.ingredienteActivoRepo.save(entity);

    return createSuccessResponse(toIngredienteResponse(saved));
  }

  // ─── Fertilizantes ────────────────────────────────────────

  @Get("fertilizantes")
  @ApiOperation({ summary: "Lista todos los fertilizantes." })
  @ApiOkResponse({ description: "Lista de fertilizantes." })
  async getFertilizantes() {
    const items = await this.fertilizanteRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(items.map(toFertilizanteResponse));
  }

  @Post("fertilizantes")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOperation({ summary: "Crea un nuevo fertilizante." })
  @ApiCreatedResponse({ description: "Fertilizante creado." })
  async createFertilizante(@Body() dto: CreateFertilizanteDto) {
    if (dto.publicId) {
      const existing = await this.fertilizanteRepo.findOne({
        where: { publicId: dto.publicId }
      });
      if (existing) {
        return createSuccessResponse(toFertilizanteResponse(existing));
      }
    }

    const entity = this.fertilizanteRepo.create({
      name: dto.name,
      type: dto.tipo as "solido" | "liquido",
      concentracion: dto.concentracion ?? null,
      unidadMedida: dto.unidadMedida ?? null
    });

    const saved = await this.fertilizanteRepo.save(entity);

    return createSuccessResponse(toFertilizanteResponse(saved));
  }

  @Patch("fertilizantes/:id")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOperation({ summary: "Actualiza un fertilizante." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Fertilizante actualizado." })
  async updateFertilizante(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() dto: UpdateFertilizanteDto
  ) {
    const entity = await this.fertilizanteRepo.findOneOrFail({ where: { id } });

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.tipo !== undefined) entity.type = dto.tipo as "solido" | "liquido";
    if (dto.concentracion !== undefined) entity.concentracion = dto.concentracion ?? null;
    if (dto.unidadMedida !== undefined) entity.unidadMedida = dto.unidadMedida ?? null;

    const saved = await this.fertilizanteRepo.save(entity);

    return createSuccessResponse(toFertilizanteResponse(saved));
  }

  // ─── Marcas de Producto ───────────────────────────────────

  @Get("marcas-producto")
  @ApiOperation({ summary: "Lista todos los nombres comerciales de producto." })
  @ApiOkResponse({ description: "Lista de nombres comerciales." })
  async getMarcasProducto() {
    const items = await this.marcaProductoRepo.find({
      where: { isActive: true },
      relations: ["ingredienteActivo"],
      order: { name: "ASC" }
    });

    return createSuccessResponse(items.map(toMarcaResponse));
  }

  @Post("marcas-producto")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOperation({ summary: "Crea una nueva marca de producto." })
  @ApiCreatedResponse({ description: "Marca de producto creada." })
  async createMarcaProducto(@Body() dto: CreateMarcaProductoDto) {
    if (dto.publicId) {
      const existing = await this.marcaProductoRepo.findOne({
        where: { publicId: dto.publicId }
      });
      if (existing) {
        return createSuccessResponse(toMarcaResponse(existing));
      }
    }

    const entity = this.marcaProductoRepo.create({
      name: dto.name,
      tipoProductoId: dto.tipoProductoId,
      ingredienteActivoId: dto.ingredienteActivoId ?? null,
      concentracion: dto.concentracion ?? null,
      unidadMedida: dto.unidadMedida ?? null
    });

    const saved = await this.marcaProductoRepo.save(entity);

    return createSuccessResponse(toMarcaResponse(saved));
  }

  @Patch("marcas-producto/:id")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOperation({ summary: "Actualiza una marca de producto." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Marca de producto actualizada." })
  async updateMarcaProducto(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() dto: UpdateMarcaProductoDto
  ) {
    const entity = await this.marcaProductoRepo.findOneOrFail({ where: { id } });

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.tipoProductoId !== undefined) entity.tipoProductoId = dto.tipoProductoId;
    if (dto.ingredienteActivoId !== undefined) entity.ingredienteActivoId = dto.ingredienteActivoId ?? null;
    if (dto.concentracion !== undefined) entity.concentracion = dto.concentracion ?? null;
    if (dto.unidadMedida !== undefined) entity.unidadMedida = dto.unidadMedida ?? null;

    const saved = await this.marcaProductoRepo.save(entity);

    return createSuccessResponse(toMarcaResponse(saved));
  }

  // ─── Resto de GETs (read-only) ────────────────────────────

  @Get("modos-accion")
  @ApiOperation({ summary: "Lista todos los modos de accion." })
  @ApiOkResponse({ description: "Lista de modos de accion." })
  async getModosAccion() {
    const items = await this.modoAccionRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({ id: i.id, name: i.name }))
    );
  }

  @Get("tipos-control")
  @ApiOperation({ summary: "Lista todos los tipos de control." })
  @ApiOkResponse({ description: "Lista de tipos de control." })
  async getTiposControl() {
    const items = await this.tipoControlRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({ id: i.id, name: i.name }))
    );
  }

  @Get("tipos-producto-fitosanitario")
  @ApiOperation({ summary: "Lista todos los tipos de producto fitosanitario." })
  @ApiOkResponse({ description: "Lista de tipos de producto." })
  async getTiposProducto() {
    const items = await this.tipoProductoRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({ id: i.id, name: i.name }))
    );
  }
}
