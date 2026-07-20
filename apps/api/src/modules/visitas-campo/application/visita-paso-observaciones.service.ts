import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { UpsertVisitaPasoObservacionDto } from "../presentation/dto/upsert-visita-paso-observacion.dto";
import { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitaPasoObservacionEntity } from "../infrastructure/persistence/entities/visita-paso-observacion.entity";

@Injectable()
export class VisitaPasoObservacionesService {
  constructor(
    @InjectRepository(VisitaPasoObservacionEntity)
    private readonly stepNotesRepository: Repository<VisitaPasoObservacionEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>
  ) {}

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const stepNotes = await this.stepNotesRepository.find({
      where: { visitaId },
      order: { stepNumber: "ASC" }
    });

    return createSuccessResponse(
      stepNotes.map((stepNote) => this.toResponse(stepNote)),
      { count: stepNotes.length }
    );
  }

  async findByVisitaIdAndStep(visitaId: string, stepNumber: number) {
    await this.ensureVisitaExists(visitaId, true);
    this.ensureValidStep(stepNumber);

    const stepNote = await this.stepNotesRepository.findOne({
      where: { visitaId, stepNumber }
    });

    if (!stepNote) {
      throw new NotFoundException("Visita step note not found.");
    }

    return createSuccessResponse(this.toResponse(stepNote));
  }

  async upsert(
    visitaId: string,
    stepNumber: number,
    dto: UpsertVisitaPasoObservacionDto
  ) {
    await this.ensureVisitaExists(visitaId);
    this.ensureValidStep(stepNumber);

    const existingStepNote = await this.stepNotesRepository.findOne({
      where: { visitaId, stepNumber }
    });

    const stepNote = existingStepNote
      ? this.stepNotesRepository.merge(existingStepNote, {
          ...(dto.observation !== undefined
            ? { observation: dto.observation }
            : {}),
          ...(dto.recommendation !== undefined
            ? { recommendation: dto.recommendation }
            : {}),
          ...(dto.finalized === true && stepNumber === 2 && !existingStepNote.finalizedAt
            ? { finalizedAt: new Date() }
            : {})
        })
      : this.stepNotesRepository.create({
          visitaId,
          stepNumber,
          observation: dto.observation ?? null,
        recommendation: dto.recommendation ?? null,
        finalizedAt: dto.finalized === true && stepNumber === 2 ? new Date() : null
        });

    const savedStepNote = await this.stepNotesRepository.save(stepNote);

    return createSuccessResponse(this.toResponse(savedStepNote));
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

  private ensureValidStep(stepNumber: number) {
    if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > 6) {
      throw new BadRequestException("Step number must be between 1 and 6.");
    }
  }

  private toResponse(stepNote: VisitaPasoObservacionEntity) {
    return {
      id: stepNote.id,
      visitaId: stepNote.visitaId,
      stepNumber: stepNote.stepNumber,
      observation: stepNote.observation,
      recommendation: stepNote.recommendation,
      finalizedAt: stepNote.finalizedAt,
      createdAt: stepNote.createdAt,
      updatedAt: stepNote.updatedAt
    };
  }
}
