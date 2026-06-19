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
import { CreateVisitaEvaluacionDto } from "../presentation/dto/create-visita-evaluacion.dto";
import { UpdateVisitaEvaluacionDto } from "../presentation/dto/update-visita-evaluacion.dto";
import { VisitaEvaluacionEntity } from "../infrastructure/persistence/entities/visita-evaluacion.entity";

@Injectable()
export class VisitaEvaluacionesService {
  constructor(
    @InjectRepository(VisitaEvaluacionEntity)
    private readonly visitaEvaluacionesRepository: Repository<VisitaEvaluacionEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>
  ) {}

  async create(visitaId: string, createVisitaEvaluacionDto: CreateVisitaEvaluacionDto) {
    await this.ensureVisitaExists(visitaId);
    await this.ensureUniqueOrder(visitaId, createVisitaEvaluacionDto.order);

    const visitaEvaluacion = this.visitaEvaluacionesRepository.create({
      visitaId,
      order: createVisitaEvaluacionDto.order,
      percentage: normalizePercentage(createVisitaEvaluacionDto.percentage),
      incidencePercentage: normalizePercentage(
        createVisitaEvaluacionDto.incidencePercentage
      ),
      description: createVisitaEvaluacionDto.description,
      organosAfectados: createVisitaEvaluacionDto.organosAfectados ?? []
    });

    try {
      const savedVisitaEvaluacion =
        await this.visitaEvaluacionesRepository.save(visitaEvaluacion);

      return createSuccessResponse(this.toResponse(savedVisitaEvaluacion));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const evaluaciones = await this.visitaEvaluacionesRepository.find({
      where: {
        visitaId
      },
      order: {
        order: "ASC",
        id: "ASC"
      }
    });

    return createSuccessResponse(
      evaluaciones.map((evaluacion) => this.toResponse(evaluacion)),
      {
        count: evaluaciones.length
      }
    );
  }

  async findById(id: string) {
    const evaluacion = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(evaluacion));
  }

  async update(id: string, updateVisitaEvaluacionDto: UpdateVisitaEvaluacionDto) {
    const evaluacion = await this.findEntityById(id);
    const nextOrder = updateVisitaEvaluacionDto.order ?? evaluacion.order;

    await this.ensureUniqueOrder(evaluacion.visitaId, nextOrder, evaluacion.id);

    const updatedEvaluacion = this.visitaEvaluacionesRepository.merge(evaluacion, {
      ...(updateVisitaEvaluacionDto.order !== undefined
        ? { order: updateVisitaEvaluacionDto.order }
        : {}),
      ...(updateVisitaEvaluacionDto.percentage !== undefined
        ? {
            percentage: normalizePercentage(updateVisitaEvaluacionDto.percentage)
          }
        : {}),
      ...(updateVisitaEvaluacionDto.incidencePercentage !== undefined
        ? {
            incidencePercentage: normalizePercentage(
              updateVisitaEvaluacionDto.incidencePercentage
            )
          }
        : {}),
      ...(updateVisitaEvaluacionDto.description !== undefined
        ? { description: updateVisitaEvaluacionDto.description }
        : {}),
      ...(updateVisitaEvaluacionDto.organosAfectados !== undefined
        ? { organosAfectados: updateVisitaEvaluacionDto.organosAfectados }
        : {})
    });

    try {
      const savedVisitaEvaluacion =
        await this.visitaEvaluacionesRepository.save(updatedEvaluacion);

      return createSuccessResponse(this.toResponse(savedVisitaEvaluacion));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const evaluacion = await this.findEntityById(id);
    const response = this.toResponse(evaluacion);

    await this.visitaEvaluacionesRepository.remove(evaluacion);

    return createSuccessResponse(response);
  }

  private async findEntityById(id: string) {
    const evaluacion = await this.visitaEvaluacionesRepository.findOne({
      where: { id }
    });

    if (!evaluacion) {
      throw new NotFoundException("Visita evaluacion not found.");
    }

    return evaluacion;
  }

  private async ensureVisitaExists(visitaId: string, useNotFoundException = false) {
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

  private async ensureUniqueOrder(visitaId: string, order: number, excludedId?: string) {
    const existingEvaluacion = await this.visitaEvaluacionesRepository.findOne({
      where: {
        visitaId,
        order
      }
    });

    if (existingEvaluacion && existingEvaluacion.id !== excludedId) {
      throw new ConflictException(
        "An evaluation with the same order already exists for this visita."
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
        databaseError.constraint === "visita_evaluaciones_visita_id_orden_key"
      ) {
        throw new ConflictException(
          "An evaluation with the same order already exists for this visita."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "visita_evaluaciones_visita_id_fkey"
      ) {
        throw new BadRequestException("Visita de campo not found.");
      }

      if (
        databaseError?.code === "23514" &&
        (databaseError.constraint === "visita_evaluaciones_porcentaje_check" ||
          databaseError.constraint === "visita_evaluaciones_incidencia_porcentaje_check")
      ) {
        throw new BadRequestException(
          "percentage values must be integers between 0 and 100."
        );
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "visita_evaluaciones_organos_afectados_check"
      ) {
        throw new BadRequestException("organosAfectados contains invalid values.");
      }
    }

    throw error;
  }

  private toResponse(visitaEvaluacion: VisitaEvaluacionEntity) {
    return {
      id: visitaEvaluacion.id,
      visitaId: visitaEvaluacion.visitaId,
      order: visitaEvaluacion.order,
      incidencePercentage: visitaEvaluacion.incidencePercentage,
      percentage: visitaEvaluacion.percentage,
      description: visitaEvaluacion.description,
      organosAfectados: visitaEvaluacion.organosAfectados ?? []
    };
  }
}

function normalizePercentage(value: number | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}
