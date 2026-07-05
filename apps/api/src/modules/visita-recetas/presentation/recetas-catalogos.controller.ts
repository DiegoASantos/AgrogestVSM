import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { CoadyuvanteEntity } from "../infrastructure/persistence/entities/coadyuvante.entity";
import { IngredienteActivoEntity } from "../infrastructure/persistence/entities/ingrediente-activo.entity";
import { MarcaProductoEntity } from "../infrastructure/persistence/entities/marca-producto.entity";
import { ModoAccionEntity } from "../infrastructure/persistence/entities/modo-accion.entity";
import { TipoControlEntity } from "../infrastructure/persistence/entities/tipo-control.entity";
import { TipoProductoFitosanitarioEntity } from "../infrastructure/persistence/entities/tipo-producto-fitosanitario.entity";
import { FertilizanteEntity } from "../infrastructure/persistence/entities/fertilizante.entity";

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

  @Get("ingredientes-activos")
  @ApiOperation({ summary: "Lista todos los ingredientes activos." })
  @ApiOkResponse({ description: "Lista de ingredientes activos." })
  async getIngredientesActivos() {
    const items = await this.ingredienteActivoRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({ id: i.id, name: i.name, description: i.description }))
    );
  }

  @Get("marcas-producto")
  @ApiOperation({ summary: "Lista todos los nombres comerciales de producto." })
  @ApiOkResponse({ description: "Lista de nombres comerciales." })
  async getMarcasProducto() {
    const items = await this.marcaProductoRepo.find({
      where: { isActive: true },
      relations: ["ingredienteActivo"],
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        tipoProductoId: i.tipoProductoId,
        ingredienteActivoId: i.ingredienteActivoId,
        ingredienteActivoNombre: i.ingredienteActivo?.name ?? null,
        concentracion: i.concentracion
      }))
    );
  }

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

  @Get("fertilizantes")
  @ApiOperation({ summary: "Lista todos los fertilizantes." })
  @ApiOkResponse({ description: "Lista de fertilizantes." })
  async getFertilizantes() {
    const items = await this.fertilizanteRepo.find({
      where: { isActive: true },
      order: { name: "ASC" }
    });

    return createSuccessResponse(
      items.map((i) => ({ id: i.id, name: i.name, type: i.type }))
    );
  }
}
