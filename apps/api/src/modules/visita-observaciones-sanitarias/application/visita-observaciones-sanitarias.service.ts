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
import { CreateVisitaObservacionSanitariaDto } from "../presentation/dto/create-visita-observacion-sanitaria.dto";
import { UpdateVisitaObservacionSanitariaDto } from "../presentation/dto/update-visita-observacion-sanitaria.dto";
import { NivelIncidenciaEntity } from "../infrastructure/persistence/entities/nivel-incidencia.entity";
import { PlagaEnfermedadEtapaNivelEntity } from "../infrastructure/persistence/entities/plaga-enfermedad-etapa-nivel.entity";
import { PlagaEnfermedadEntity } from "../infrastructure/persistence/entities/plaga-enfermedad.entity";
import { VisitaObservacionSanitariaEntity } from "../infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaObservacionSanitariaOrganoEntity } from "../infrastructure/persistence/entities/visita-observacion-sanitaria-organo.entity";
import type { OrganoAfectado } from "../domain/organo-afectado";

@Injectable()
export class VisitaObservacionesSanitariasService {
  constructor(
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observacionesRepository: Repository<VisitaObservacionSanitariaEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(PlagaEnfermedadEntity)
    private readonly plagasEnfermedadesRepository: Repository<PlagaEnfermedadEntity>,
    @InjectRepository(NivelIncidenciaEntity)
    private readonly nivelesIncidenciaRepository: Repository<NivelIncidenciaEntity>,
    @InjectRepository(PlagaEnfermedadEtapaNivelEntity)
    private readonly plagasEnfermedadesEtapasNivelesRepository: Repository<PlagaEnfermedadEtapaNivelEntity>,
    @InjectRepository(VisitaObservacionSanitariaOrganoEntity)
    private readonly observacionOrganosRepository: Repository<VisitaObservacionSanitariaOrganoEntity>
  ) {}

  async create(visitaId: string, createDto: CreateVisitaObservacionSanitariaDto) {
    const visita = await this.ensureVisitaExists(visitaId);
    await this.ensurePlagaEnfermedadExists(createDto.pestDiseaseId);
    await this.ensureNivelIncidenciaExists(createDto.incidenceLevelId, "incidencia");
    await this.ensureNivelIncidenciaExists(createDto.severityLevelId, "severidad");
    await this.ensurePestDiseaseMatchesVisitStage(visita, createDto.pestDiseaseId);
    await this.ensureUniquePestDisease(visitaId, createDto.pestDiseaseId);

    const observacion = this.observacionesRepository.create({
      visitaId,
      plagaEnfermedadId: createDto.pestDiseaseId,
      nivelIncidenciaId: createDto.incidenceLevelId ?? null,
      nivelSeveridadId: createDto.severityLevelId ?? null,
      incidencePercentage: normalizePercentage(createDto.incidencePercentage),
      observation: createDto.observation ?? null
    });

    try {
      const savedObservacion = await this.observacionesRepository.save(observacion);
      await this.replaceOrganosAfectados(savedObservacion.id, createDto.organosAfectados);
      const savedWithOrganos = await this.findEntityById(savedObservacion.id);

      return createSuccessResponse(this.toResponse(savedWithOrganos));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const observaciones = await this.observacionesRepository.find({
      where: {
        visitaId
      },
      relations: {
        organosAfectados: true
      },
      order: {
        id: "ASC"
      }
    });

    return createSuccessResponse(
      observaciones.map((observacion) => this.toResponse(observacion)),
      {
        count: observaciones.length
      }
    );
  }

  async findById(id: string) {
    const observacion = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(observacion));
  }

  async update(id: string, updateDto: UpdateVisitaObservacionSanitariaDto) {
    const observacion = await this.findEntityById(id);
    const nextPestDiseaseId = updateDto.pestDiseaseId ?? observacion.plagaEnfermedadId;
    const nextIncidenceLevelId =
      updateDto.incidenceLevelId !== undefined
        ? updateDto.incidenceLevelId
        : observacion.nivelIncidenciaId;
    const nextSeverityLevelId =
      updateDto.severityLevelId !== undefined
        ? updateDto.severityLevelId
        : observacion.nivelSeveridadId;

    if (updateDto.pestDiseaseId !== undefined) {
      await this.ensurePlagaEnfermedadExists(updateDto.pestDiseaseId);
    }

    if (updateDto.incidenceLevelId !== undefined) {
      await this.ensureNivelIncidenciaExists(updateDto.incidenceLevelId, "incidencia");
    }

    if (updateDto.severityLevelId !== undefined) {
      await this.ensureNivelIncidenciaExists(updateDto.severityLevelId, "severidad");
    }

    const visita = await this.ensureVisitaExists(observacion.visitaId);
    await this.ensurePestDiseaseMatchesVisitStage(visita, nextPestDiseaseId);

    await this.ensureUniquePestDisease(
      observacion.visitaId,
      nextPestDiseaseId,
      observacion.id
    );

    const updatedObservacion = this.observacionesRepository.merge(observacion, {
      ...(updateDto.pestDiseaseId !== undefined
        ? { plagaEnfermedadId: updateDto.pestDiseaseId }
        : {}),
      ...(updateDto.incidenceLevelId !== undefined
        ? { nivelIncidenciaId: nextIncidenceLevelId ?? null }
        : {}),
      ...(updateDto.severityLevelId !== undefined
        ? { nivelSeveridadId: nextSeverityLevelId ?? null }
        : {}),
      ...(updateDto.incidencePercentage !== undefined
        ? { incidencePercentage: normalizePercentage(updateDto.incidencePercentage) }
        : {}),
      ...(updateDto.observation !== undefined
        ? { observation: updateDto.observation }
        : {})
    });

    try {
      const savedObservacion =
        await this.observacionesRepository.save(updatedObservacion);

      if (updateDto.organosAfectados !== undefined) {
        await this.replaceOrganosAfectados(
          savedObservacion.id,
          updateDto.organosAfectados
        );
      }

      const savedWithOrganos = await this.findEntityById(savedObservacion.id);

      return createSuccessResponse(this.toResponse(savedWithOrganos));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const observacion = await this.findEntityById(id);
    const response = this.toResponse(observacion);

    await this.observacionesRepository.remove(observacion);

    return createSuccessResponse(response);
  }

  private async findEntityById(id: string) {
    const observacion = await this.observacionesRepository.findOne({
      where: { id },
      relations: {
        organosAfectados: true
      }
    });

    if (!observacion) {
      throw new NotFoundException("Visita observacion sanitaria not found.");
    }

    return observacion;
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

  private async ensurePlagaEnfermedadExists(plagaEnfermedadId: string) {
    const plagaEnfermedad = await this.plagasEnfermedadesRepository.findOne({
      where: { id: plagaEnfermedadId }
    });

    if (!plagaEnfermedad) {
      throw new BadRequestException("Plaga enfermedad not found.");
    }
  }

  private async ensureNivelIncidenciaExists(
    nivelIncidenciaId: number | null | undefined,
    expectedType: "incidencia" | "severidad"
  ) {
    if (nivelIncidenciaId === undefined || nivelIncidenciaId === null) {
      return;
    }

    const nivelIncidencia = await this.nivelesIncidenciaRepository.findOne({
      where: { id: nivelIncidenciaId }
    });

    if (!nivelIncidencia) {
      throw new BadRequestException("Nivel incidencia not found.");
    }

    if (nivelIncidencia.type !== expectedType) {
      throw new BadRequestException(`Nivel must be classified as ${expectedType}.`);
    }
  }

  private async ensurePestDiseaseMatchesVisitStage(
    visita: VisitaCampoEntity,
    plagaEnfermedadId: string
  ) {
    if (!visita.etapaFenologicaId) {
      throw new BadRequestException("Visita has no phenological stage.");
    }

    const relation = await this.plagasEnfermedadesEtapasNivelesRepository.findOne({
      where: {
        plagaEnfermedadId,
        etapaFenologicaId: visita.etapaFenologicaId,
        isActive: true
      }
    });

    if (!relation) {
      throw new BadRequestException(
        "Pest disease is not available for the visit phenological stage."
      );
    }
  }

  private async ensureUniquePestDisease(
    visitaId: string,
    plagaEnfermedadId: string,
    excludedId?: string
  ) {
    const existingObservacion = await this.observacionesRepository.findOne({
      where: {
        visitaId,
        plagaEnfermedadId
      }
    });

    if (existingObservacion && existingObservacion.id !== excludedId) {
      throw new ConflictException(
        "An observation with the same pest disease already exists for this visita."
      );
    }
  }

  private async replaceOrganosAfectados(
    observacionId: string,
    organosAfectados: string[]
  ) {
    const uniqueOrganos = [...new Set(organosAfectados)] as OrganoAfectado[];

    await this.observacionOrganosRepository.delete({
      visitaObservacionSanitariaId: observacionId
    });

    if (uniqueOrganos.length === 0) {
      return;
    }

    await this.observacionOrganosRepository.save(
      uniqueOrganos.map((organo) =>
        this.observacionOrganosRepository.create({
          visitaObservacionSanitariaId: observacionId,
          organo
        })
      )
    );
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
          "visita_observaciones_sanitari_visita_id_plaga_enfermedad_id_key"
      ) {
        throw new ConflictException(
          "An observation with the same pest disease already exists for this visita."
        );
      }

      if (databaseError?.code === "23503") {
        switch (databaseError.constraint) {
          case "visita_observaciones_sanitarias_visita_id_fkey":
            throw new BadRequestException("Visita de campo not found.");
          case "visita_observaciones_sanitarias_plaga_enfermedad_id_fkey":
            throw new BadRequestException("Plaga enfermedad not found.");
          case "visita_observaciones_sanitarias_nivel_incidencia_id_fkey":
            throw new BadRequestException("Nivel incidencia not found.");
          case "visita_observaciones_sanitarias_nivel_severidad_id_fkey":
            throw new BadRequestException("Nivel severidad not found.");
        }
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint ===
          "visita_observaciones_sanitarias_incidencia_porcentaje_check"
      ) {
        throw new BadRequestException(
          "incidencePercentage must be an integer between 0 and 100."
        );
      }
    }

    throw error;
  }

  private toResponse(observacion: VisitaObservacionSanitariaEntity) {
    return {
      id: observacion.id,
      visitaId: observacion.visitaId,
      pestDiseaseId: observacion.plagaEnfermedadId,
      incidenceLevelId: observacion.nivelIncidenciaId,
      severityLevelId: observacion.nivelSeveridadId,
      incidencePercentage: observacion.incidencePercentage,
      observation: observacion.observation,
      organosAfectados: (observacion.organosAfectados ?? [])
        .map((organo) => organo.organo)
        .sort()
    };
  }
}

function normalizePercentage(value: number | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}
