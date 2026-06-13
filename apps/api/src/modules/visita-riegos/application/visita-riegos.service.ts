import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { TipoRiegoEntity } from "../../operaciones-campo/infrastructure/persistence/entities/tipo-riego.entity";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaRiegoEntity } from "../infrastructure/persistence/entities/visita-riego.entity";
import { CreateVisitaRiegoDto } from "../presentation/dto/create-visita-riego.dto";
import { UpdateVisitaRiegoDto } from "../presentation/dto/update-visita-riego.dto";

@Injectable()
export class VisitaRiegosService {
  constructor(
    @InjectRepository(VisitaRiegoEntity)
    private readonly visitaRiegosRepository: Repository<VisitaRiegoEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(TipoRiegoEntity)
    private readonly tiposRiegoRepository: Repository<TipoRiegoEntity>
  ) {}

  async create(visitaId: string, createDto: CreateVisitaRiegoDto) {
    await this.ensureVisitaExists(visitaId);
    await this.ensureTipoRiegoExists(String(createDto.tipoRiegoId));

    const existing = await this.visitaRiegosRepository.findOne({
      where: { visitaId }
    });

    if (existing) {
      throw new ConflictException("A riego record already exists for this visita.");
    }

    const riego = this.visitaRiegosRepository.create({
      visitaId,
      tipoRiegoId: String(createDto.tipoRiegoId)
    });

    try {
      const savedRiego = await this.visitaRiegosRepository.save(riego);

      return createSuccessResponse(this.toResponse(savedRiego));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const riego = await this.visitaRiegosRepository.findOne({
      where: { visitaId }
    });

    return createSuccessResponse(riego ? this.toResponse(riego) : null);
  }

  async update(id: string, updateDto: UpdateVisitaRiegoDto) {
    const riego = await this.findEntityById(id);

    if (updateDto.tipoRiegoId !== undefined) {
      await this.ensureTipoRiegoExists(String(updateDto.tipoRiegoId));
      riego.tipoRiegoId = String(updateDto.tipoRiegoId);
    }

    try {
      const savedRiego = await this.visitaRiegosRepository.save(riego);

      return createSuccessResponse(this.toResponse(savedRiego));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const riego = await this.findEntityById(id);
    const response = this.toResponse(riego);

    await this.visitaRiegosRepository.remove(riego);

    return createSuccessResponse(response);
  }

  private async findEntityById(id: string) {
    const riego = await this.visitaRiegosRepository.findOne({
      where: { id }
    });

    if (!riego) {
      throw new NotFoundException("Visita riego not found.");
    }

    return riego;
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

  private async ensureTipoRiegoExists(tipoRiegoId: string) {
    const tipoRiego = await this.tiposRiegoRepository.findOne({
      where: { id: tipoRiegoId, isActive: true }
    });

    if (!tipoRiego) {
      throw new BadRequestException("Tipo de riego not found.");
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
        databaseError.constraint === "visita_riegos_visita_id_key"
      ) {
        throw new ConflictException("A riego record already exists for this visita.");
      }

      if (databaseError?.code === "23503") {
        throw new BadRequestException("Related visita or tipo de riego not found.");
      }
    }

    throw error;
  }

  private toResponse(riego: VisitaRiegoEntity) {
    return {
      id: riego.id,
      visitaId: riego.visitaId,
      tipoRiegoId: riego.tipoRiegoId
    };
  }
}
