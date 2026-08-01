import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { NutrienteEntity } from "../../nutricion/infrastructure/persistence/entities/nutriente.entity";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { resolveNutritionIncidenceGrade } from "../../visitas-campo/domain/nutrition-incidence";
import { CreateVisitaEvaluacionDto } from "../presentation/dto/create-visita-evaluacion.dto";
import { UpdateVisitaEvaluacionDto } from "../presentation/dto/update-visita-evaluacion.dto";
import { VisitaEvaluacionEntity } from "../infrastructure/persistence/entities/visita-evaluacion.entity";

@Injectable()
export class VisitaEvaluacionesService {
  constructor(
    @InjectRepository(VisitaEvaluacionEntity)
    private readonly visitaEvaluacionesRepository: Repository<VisitaEvaluacionEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(NutrienteEntity)
    private readonly nutrientesRepository: Repository<NutrienteEntity>
  ) {}

  async create(visitaId: string, createVisitaEvaluacionDto: CreateVisitaEvaluacionDto) {
    const visita = await this.ensureVisitaExists(visitaId);
    await this.ensureUniqueOrder(visitaId, createVisitaEvaluacionDto.order);
    const nutrition = await this.resolveNutritionEvaluation(
      visita,
      createVisitaEvaluacionDto.description,
      createVisitaEvaluacionDto.nutrientId,
      createVisitaEvaluacionDto.incidencePercentage,
      createVisitaEvaluacionDto.organosAfectados ?? []
    );

    const visitaEvaluacion = this.visitaEvaluacionesRepository.create({
      visitaId,
      nutrientId: nutrition.nutrientId,
      order: createVisitaEvaluacionDto.order,
      percentage: normalizePercentage(createVisitaEvaluacionDto.percentage),
      incidencePercentage: normalizePercentage(
        createVisitaEvaluacionDto.incidencePercentage
      ),
      description: createVisitaEvaluacionDto.description,
      organosAfectados: nutrition.organosAfectados
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
    const visita = await this.ensureVisitaExists(evaluacion.visitaId);
    const nextDescription =
      updateVisitaEvaluacionDto.description ?? evaluacion.description;
    const nextIncidencePercentage =
      updateVisitaEvaluacionDto.incidencePercentage !== undefined
        ? updateVisitaEvaluacionDto.incidencePercentage
        : evaluacion.incidencePercentage === null
          ? null
          : Number(evaluacion.incidencePercentage);
    const nutrition = await this.resolveNutritionEvaluation(
      visita,
      nextDescription,
      updateVisitaEvaluacionDto.nutrientId !== undefined
        ? updateVisitaEvaluacionDto.nutrientId
        : evaluacion.nutrientId,
      nextIncidencePercentage,
      updateVisitaEvaluacionDto.organosAfectados ?? evaluacion.organosAfectados
    );

    await this.ensureUniqueOrder(evaluacion.visitaId, nextOrder, evaluacion.id);

    const updatedEvaluacion = this.visitaEvaluacionesRepository.merge(evaluacion, {
      ...(updateVisitaEvaluacionDto.nutrientId !== undefined || nutrition.isNutrition
        ? { nutrientId: nutrition.nutrientId }
        : {}),
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
      ...(updateVisitaEvaluacionDto.organosAfectados !== undefined ||
      nutrition.isNutrition
        ? { organosAfectados: nutrition.organosAfectados }
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

    return visita;
  }

  private async resolveNutritionEvaluation(
    visita: VisitaCampoEntity,
    description: string,
    nutrientId: string | null | undefined,
    incidencePercentage: number | null | undefined,
    organosAfectados: string[]
  ) {
    const isNutrition = Boolean(nutrientId) || isNutritionDescription(description);
    if (!isNutrition) {
      return { isNutrition: false, nutrientId: null, organosAfectados };
    }
    if (incidencePercentage === null || incidencePercentage === undefined) {
      throw new BadRequestException(
        "El porcentaje de árboles afectados es obligatorio para Nutrición."
      );
    }
    try {
      resolveNutritionIncidenceGrade(incidencePercentage);
    } catch {
      throw new BadRequestException(
        "El porcentaje de árboles afectados debe ser un entero entre 0 y 100."
      );
    }

    const nutrient = nutrientId
      ? await this.nutrientesRepository.findOne({
          where: { id: nutrientId, cultivoId: visita.cultivoId, isActive: true }
        })
      : await this.findLegacyNutritionNutrient(visita.cultivoId, description);
    if (!nutrient) {
      throw new BadRequestException(
        "El nutriente no está disponible para el cultivo de la visita."
      );
    }

    return {
      isNutrition: true,
      nutrientId: nutrient.id,
      organosAfectados: incidencePercentage === 0 ? [] : organosAfectados
    };
  }

  private async findLegacyNutritionNutrient(cultivoId: string, description: string) {
    const expectedName = normalizeCatalogName(
      description.slice("Nutricion -".length).split(":", 1)[0]
    );
    const nutrients = await this.nutrientesRepository.find({
      where: { cultivoId, isActive: true }
    });

    return (
      nutrients.find(
        (nutrient) => normalizeCatalogName(nutrient.name) === expectedName
      ) ?? null
    );
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
        databaseError?.code === "23505" &&
        databaseError.constraint === "uq_visita_evaluaciones_visita_nutriente"
      ) {
        throw new ConflictException(
          "La deficiencia nutricional ya fue evaluada en esta visita."
        );
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint ===
          "visita_evaluaciones_nutricion_porcentaje_requerido_check"
      ) {
        throw new BadRequestException(
          "El porcentaje de árboles afectados es obligatorio para Nutrición."
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
      nutrientId: visitaEvaluacion.nutrientId,
      order: visitaEvaluacion.order,
      incidencePercentage: visitaEvaluacion.incidencePercentage,
      percentage: visitaEvaluacion.percentage,
      description: visitaEvaluacion.description,
      organosAfectados: visitaEvaluacion.organosAfectados ?? []
    };
  }
}

function isNutritionDescription(value: string) {
  return value.startsWith("Nutricion -");
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePercentage(value: number | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}
