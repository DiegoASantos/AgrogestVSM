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
import { PlagaEnfermedadEntity } from "../infrastructure/persistence/entities/plaga-enfermedad.entity";
import { VisitaObservacionSanitariaEntity } from "../infrastructure/persistence/entities/visita-observacion-sanitaria.entity";

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
    private readonly nivelesIncidenciaRepository: Repository<NivelIncidenciaEntity>
  ) {}

  async create(
    visitaId: string,
    createDto: CreateVisitaObservacionSanitariaDto
  ) {
    await this.ensureVisitaExists(visitaId);
    await this.ensurePlagaEnfermedadExists(createDto.pestDiseaseId);
    await this.ensureNivelIncidenciaExists(createDto.incidenceLevelId);
    await this.ensureUniquePestDisease(visitaId, createDto.pestDiseaseId);

    const observacion = this.observacionesRepository.create({
      visitaId,
      plagaEnfermedadId: createDto.pestDiseaseId,
      nivelIncidenciaId: createDto.incidenceLevelId ?? null,
      observation: createDto.observation ?? null
    });

    try {
      const savedObservacion = await this.observacionesRepository.save(observacion);

      return createSuccessResponse(this.toResponse(savedObservacion));
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

  async update(
    id: string,
    updateDto: UpdateVisitaObservacionSanitariaDto
  ) {
    const observacion = await this.findEntityById(id);
    const nextPestDiseaseId =
      updateDto.pestDiseaseId ?? observacion.plagaEnfermedadId;
    const nextIncidenceLevelId =
      updateDto.incidenceLevelId !== undefined
        ? updateDto.incidenceLevelId
        : observacion.nivelIncidenciaId;

    if (updateDto.pestDiseaseId !== undefined) {
      await this.ensurePlagaEnfermedadExists(updateDto.pestDiseaseId);
    }

    if (updateDto.incidenceLevelId !== undefined) {
      await this.ensureNivelIncidenciaExists(updateDto.incidenceLevelId);
    }

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
      ...(updateDto.observation !== undefined
        ? { observation: updateDto.observation }
        : {})
    });

    try {
      const savedObservacion =
        await this.observacionesRepository.save(updatedObservacion);

      return createSuccessResponse(this.toResponse(savedObservacion));
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
      where: { id }
    });

    if (!observacion) {
      throw new NotFoundException("Visita observacion sanitaria not found.");
    }

    return observacion;
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

  private async ensurePlagaEnfermedadExists(plagaEnfermedadId: string) {
    const plagaEnfermedad = await this.plagasEnfermedadesRepository.findOne({
      where: { id: plagaEnfermedadId }
    });

    if (!plagaEnfermedad) {
      throw new BadRequestException("Plaga enfermedad not found.");
    }
  }

  private async ensureNivelIncidenciaExists(
    nivelIncidenciaId: number | null | undefined
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
        }
      }
    }

    throw error;
  }

  private toResponse(
    observacion: VisitaObservacionSanitariaEntity
  ) {
    return {
      id: observacion.id,
      visitaId: observacion.visitaId,
      pestDiseaseId: observacion.plagaEnfermedadId,
      incidenceLevelId: observacion.nivelIncidenciaId,
      observation: observacion.observation
    };
  }
}
