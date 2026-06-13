import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { LaborCulturalEntity } from "../../operaciones-campo/infrastructure/persistence/entities/labor-cultural.entity";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaLaborCulturalEntity } from "../infrastructure/persistence/entities/visita-labor-cultural.entity";
import { CreateVisitaLaborCulturalDto } from "../presentation/dto/create-visita-labor-cultural.dto";

@Injectable()
export class VisitaLaboresCulturalesService {
  constructor(
    @InjectRepository(VisitaLaborCulturalEntity)
    private readonly visitaLaboresRepository: Repository<VisitaLaborCulturalEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(LaborCulturalEntity)
    private readonly laboresCulturalesRepository: Repository<LaborCulturalEntity>
  ) {}

  async create(visitaId: string, createDto: CreateVisitaLaborCulturalDto) {
    await this.ensureVisitaExists(visitaId);
    await this.ensureLaborCulturalExists(String(createDto.laborCulturalId));

    const labor = this.visitaLaboresRepository.create({
      visitaId,
      laborCulturalId: String(createDto.laborCulturalId)
    });

    try {
      const savedLabor = await this.visitaLaboresRepository.save(labor);

      return createSuccessResponse(this.toResponse(savedLabor));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const labores = await this.visitaLaboresRepository.find({
      where: { visitaId },
      order: { id: "ASC" }
    });

    return createSuccessResponse(
      labores.map((labor) => this.toResponse(labor)),
      { count: labores.length }
    );
  }

  async remove(id: string) {
    const labor = await this.findEntityById(id);
    const response = this.toResponse(labor);

    await this.visitaLaboresRepository.remove(labor);

    return createSuccessResponse(response);
  }

  private async findEntityById(id: string) {
    const labor = await this.visitaLaboresRepository.findOne({
      where: { id }
    });

    if (!labor) {
      throw new NotFoundException("Visita labor cultural not found.");
    }

    return labor;
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

  private async ensureLaborCulturalExists(laborCulturalId: string) {
    const labor = await this.laboresCulturalesRepository.findOne({
      where: { id: laborCulturalId, isActive: true }
    });

    if (!labor) {
      throw new BadRequestException("Labor cultural not found.");
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
        databaseError.constraint === "visita_labores_culturales_visita_labor_key"
      ) {
        throw new ConflictException(
          "The labor cultural already exists for this visita."
        );
      }

      if (databaseError?.code === "23503") {
        throw new BadRequestException("Related visita or labor cultural not found.");
      }
    }

    throw error;
  }

  private toResponse(labor: VisitaLaborCulturalEntity) {
    return {
      id: labor.id,
      visitaId: labor.visitaId,
      laborCulturalId: labor.laborCulturalId
    };
  }
}
