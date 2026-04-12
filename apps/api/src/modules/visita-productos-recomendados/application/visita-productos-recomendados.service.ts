import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { CreateVisitaProductoRecomendadoDto } from "../presentation/dto/create-visita-producto-recomendado.dto";
import { UpdateVisitaProductoRecomendadoDto } from "../presentation/dto/update-visita-producto-recomendado.dto";
import { FrecuenciaAplicacionEntity } from "../infrastructure/persistence/entities/frecuencia-aplicacion.entity";
import { ProductoEntity } from "../infrastructure/persistence/entities/producto.entity";
import { VisitaProductoRecomendadoEntity } from "../infrastructure/persistence/entities/visita-producto-recomendado.entity";

@Injectable()
export class VisitaProductosRecomendadosService {
  constructor(
    @InjectRepository(VisitaProductoRecomendadoEntity)
    private readonly productosRecomendadosRepository: Repository<VisitaProductoRecomendadoEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productosRepository: Repository<ProductoEntity>,
    @InjectRepository(FrecuenciaAplicacionEntity)
    private readonly frecuenciasAplicacionRepository: Repository<FrecuenciaAplicacionEntity>
  ) {}

  async create(
    visitaId: string,
    createDto: CreateVisitaProductoRecomendadoDto
  ) {
    await this.ensureVisitaExists(visitaId);
    await this.ensureProductoExists(createDto.productId);
    await this.ensureFrecuenciaAplicacionExists(createDto.applicationFrequencyId);

    const productoRecomendado = this.productosRecomendadosRepository.create({
      visitaId,
      productoId: createDto.productId,
      dose: createDto.dose,
      frecuenciaAplicacionId: createDto.applicationFrequencyId ?? null,
      instructions: createDto.instructions ?? null
    });

    try {
      const savedProductoRecomendado =
        await this.productosRecomendadosRepository.save(productoRecomendado);

      return createSuccessResponse(this.toResponse(savedProductoRecomendado));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const productosRecomendados = await this.productosRecomendadosRepository.find(
      {
        where: {
          visitaId
        },
        order: {
          id: "ASC"
        }
      }
    );

    return createSuccessResponse(
      productosRecomendados.map((productoRecomendado) =>
        this.toResponse(productoRecomendado)
      ),
      {
        count: productosRecomendados.length
      }
    );
  }

  async findById(id: string) {
    const productoRecomendado = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(productoRecomendado));
  }

  async update(
    id: string,
    updateDto: UpdateVisitaProductoRecomendadoDto
  ) {
    const productoRecomendado = await this.findEntityById(id);

    if (updateDto.productId !== undefined) {
      await this.ensureProductoExists(updateDto.productId);
    }

    if (updateDto.applicationFrequencyId !== undefined) {
      await this.ensureFrecuenciaAplicacionExists(
        updateDto.applicationFrequencyId
      );
    }

    const updatedProductoRecomendado =
      this.productosRecomendadosRepository.merge(productoRecomendado, {
        ...(updateDto.productId !== undefined
          ? { productoId: updateDto.productId }
          : {}),
        ...(updateDto.dose !== undefined ? { dose: updateDto.dose } : {}),
        ...(updateDto.applicationFrequencyId !== undefined
          ? { frecuenciaAplicacionId: updateDto.applicationFrequencyId }
          : {}),
        ...(updateDto.instructions !== undefined
          ? { instructions: updateDto.instructions }
          : {})
      });

    try {
      const savedProductoRecomendado =
        await this.productosRecomendadosRepository.save(updatedProductoRecomendado);

      return createSuccessResponse(this.toResponse(savedProductoRecomendado));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const productoRecomendado = await this.findEntityById(id);
    const response = this.toResponse(productoRecomendado);

    await this.productosRecomendadosRepository.remove(productoRecomendado);

    return createSuccessResponse(response);
  }

  private async findEntityById(id: string) {
    const productoRecomendado = await this.productosRecomendadosRepository.findOne({
      where: { id }
    });

    if (!productoRecomendado) {
      throw new NotFoundException("Visita producto recomendado not found.");
    }

    return productoRecomendado;
  }

  private async ensureVisitaExists(
    visitaId: string,
    useNotFoundException = false
  ) {
    const visita = await this.visitasCampoRepository.findOne({
      where: { id: visitaId }
    });

    if (!visita) {
      if (useNotFoundException) {
        throw new NotFoundException("Visita de campo not found.");
      }

      throw new BadRequestException("Visita de campo not found.");
    }
  }

  private async ensureProductoExists(productId: string) {
    const producto = await this.productosRepository.findOne({
      where: { id: productId }
    });

    if (!producto) {
      throw new BadRequestException("Producto not found.");
    }
  }

  private async ensureFrecuenciaAplicacionExists(
    applicationFrequencyId: string | null | undefined
  ) {
    if (
      applicationFrequencyId === undefined ||
      applicationFrequencyId === null
    ) {
      return;
    }

    const frecuenciaAplicacion =
      await this.frecuenciasAplicacionRepository.findOne({
        where: { id: applicationFrequencyId }
      });

    if (!frecuenciaAplicacion) {
      throw new BadRequestException("Frecuencia aplicacion not found.");
    }
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (databaseError?.code === "23503") {
        switch (databaseError.constraint) {
          case "visita_productos_recomendados_visita_id_fkey":
            throw new BadRequestException("Visita de campo not found.");
          case "visita_productos_recomendados_producto_id_fkey":
            throw new BadRequestException("Producto not found.");
          case "visita_productos_recomendados_frecuencia_aplicacion_id_fkey":
            throw new BadRequestException("Frecuencia aplicacion not found.");
        }
      }
    }

    throw error;
  }

  private toResponse(
    productoRecomendado: VisitaProductoRecomendadoEntity
  ) {
    return {
      id: productoRecomendado.id,
      visitaId: productoRecomendado.visitaId,
      productId: productoRecomendado.productoId,
      dose: productoRecomendado.dose,
      applicationFrequencyId: productoRecomendado.frecuenciaAplicacionId,
      instructions: productoRecomendado.instructions
    };
  }
}
