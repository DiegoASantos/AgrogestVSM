import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { CreateVisitaRecomendacionDto } from "../presentation/dto/create-visita-recomendacion.dto";
import { UpdateVisitaRecomendacionDto } from "../presentation/dto/update-visita-recomendacion.dto";
import { TipoRecomendacionEntity } from "../infrastructure/persistence/entities/tipo-recomendacion.entity";
import { VisitaRecomendacionEntity } from "../infrastructure/persistence/entities/visita-recomendacion.entity";

@Injectable()
export class VisitaRecomendacionesService {
  constructor(
    @InjectRepository(VisitaRecomendacionEntity)
    private readonly visitaRecomendacionesRepository: Repository<VisitaRecomendacionEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(TipoRecomendacionEntity)
    private readonly tiposRecomendacionRepository: Repository<TipoRecomendacionEntity>
  ) {}

  async create(
    visitaId: string,
    createDto: CreateVisitaRecomendacionDto
  ) {
    await this.ensureVisitaExists(visitaId);
    await this.ensureTipoRecomendacionExists(createDto.recommendationTypeId);
    await this.ensureUniqueRecommendationType(
      visitaId,
      createDto.recommendationTypeId
    );

    const recomendacion = this.visitaRecomendacionesRepository.create({
      visitaId,
      tipoRecomendacionId: createDto.recommendationTypeId,
      applies: createDto.applies ?? true,
      detail: createDto.detail ?? null
    });

    try {
      const savedRecomendacion =
        await this.visitaRecomendacionesRepository.save(recomendacion);

      return createSuccessResponse(this.toResponse(savedRecomendacion));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const recomendaciones = await this.visitaRecomendacionesRepository.find({
      where: {
        visitaId
      },
      order: {
        id: "ASC"
      }
    });

    return createSuccessResponse(
      recomendaciones.map((recomendacion) => this.toResponse(recomendacion)),
      {
        count: recomendaciones.length
      }
    );
  }

  async findById(id: string) {
    const recomendacion = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(recomendacion));
  }

  async update(
    id: string,
    updateDto: UpdateVisitaRecomendacionDto
  ) {
    const recomendacion = await this.findEntityById(id);
    const nextRecommendationTypeId =
      updateDto.recommendationTypeId ?? recomendacion.tipoRecomendacionId;

    if (updateDto.recommendationTypeId !== undefined) {
      await this.ensureTipoRecomendacionExists(updateDto.recommendationTypeId);
    }

    await this.ensureUniqueRecommendationType(
      recomendacion.visitaId,
      nextRecommendationTypeId,
      recomendacion.id
    );

    const updatedRecomendacion =
      this.visitaRecomendacionesRepository.merge(recomendacion, {
        ...(updateDto.recommendationTypeId !== undefined
          ? { tipoRecomendacionId: updateDto.recommendationTypeId }
          : {}),
        ...(updateDto.applies !== undefined
          ? { applies: updateDto.applies }
          : {}),
        ...(updateDto.detail !== undefined ? { detail: updateDto.detail } : {})
      });

    try {
      const savedRecomendacion =
        await this.visitaRecomendacionesRepository.save(updatedRecomendacion);

      return createSuccessResponse(this.toResponse(savedRecomendacion));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const recomendacion = await this.findEntityById(id);
    const response = this.toResponse(recomendacion);

    await this.visitaRecomendacionesRepository.remove(recomendacion);

    return createSuccessResponse(response);
  }

  private async findEntityById(id: string) {
    const recomendacion = await this.visitaRecomendacionesRepository.findOne({
      where: { id }
    });

    if (!recomendacion) {
      throw new NotFoundException("Visita recomendacion not found.");
    }

    return recomendacion;
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

  private async ensureTipoRecomendacionExists(tipoRecomendacionId: string) {
    const tipoRecomendacion = await this.tiposRecomendacionRepository.findOne({
      where: { id: tipoRecomendacionId }
    });

    if (!tipoRecomendacion) {
      throw new BadRequestException("Tipo recomendacion not found.");
    }
  }

  private async ensureUniqueRecommendationType(
    visitaId: string,
    tipoRecomendacionId: string,
    excludedId?: string
  ) {
    const existingRecomendacion = await this.visitaRecomendacionesRepository.findOne({
      where: {
        visitaId,
        tipoRecomendacionId
      }
    });

    if (existingRecomendacion && existingRecomendacion.id !== excludedId) {
      throw new ConflictException(
        "A recommendation with the same type already exists for this visita."
      );
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

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint ===
          "visita_recomendaciones_visita_id_tipo_recomendacion_id_key"
      ) {
        throw new ConflictException(
          "A recommendation with the same type already exists for this visita."
        );
      }

      if (databaseError?.code === "23503") {
        switch (databaseError.constraint) {
          case "visita_recomendaciones_visita_id_fkey":
            throw new BadRequestException("Visita de campo not found.");
          case "visita_recomendaciones_tipo_recomendacion_id_fkey":
            throw new BadRequestException("Tipo recomendacion not found.");
        }
      }
    }

    throw error;
  }

  private toResponse(recomendacion: VisitaRecomendacionEntity) {
    return {
      id: recomendacion.id,
      visitaId: recomendacion.visitaId,
      recommendationTypeId: recomendacion.tipoRecomendacionId,
      applies: recomendacion.applies,
      detail: recomendacion.detail
    };
  }
}
