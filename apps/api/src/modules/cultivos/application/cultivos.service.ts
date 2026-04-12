import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { CultivoEntity } from "../infrastructure/persistence/entities/cultivo.entity";
import { CreateCultivoDto } from "../presentation/dto/create-cultivo.dto";
import { UpdateCultivoDto } from "../presentation/dto/update-cultivo.dto";

@Injectable()
export class CultivosService {
  constructor(
    @InjectRepository(CultivoEntity)
    private readonly cultivosRepository: Repository<CultivoEntity>
  ) {}

  async create(createCultivoDto: CreateCultivoDto) {
    const cultivo = this.cultivosRepository.create({
      code: createCultivoDto.code ?? null,
      name: createCultivoDto.name,
      isActive: createCultivoDto.isActive ?? true
    });

    try {
      const savedCultivo = await this.cultivosRepository.save(cultivo);

      return createSuccessResponse(this.toResponse(savedCultivo));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(pagination: PaginationQueryDto) {
    const [cultivos, total] = await this.cultivosRepository.findAndCount({
      order: {
        name: "ASC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      cultivos.map((cultivo) => this.toResponse(cultivo)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const cultivo = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(cultivo));
  }

  async update(id: string, updateCultivoDto: UpdateCultivoDto) {
    const cultivo = await this.findEntityById(id);
    const updatedCultivo = this.cultivosRepository.merge(cultivo, {
      ...(updateCultivoDto.code !== undefined
        ? { code: updateCultivoDto.code }
        : {}),
      ...(updateCultivoDto.name !== undefined
        ? { name: updateCultivoDto.name }
        : {}),
      ...(updateCultivoDto.isActive !== undefined
        ? { isActive: updateCultivoDto.isActive }
        : {})
    });

    try {
      const savedCultivo = await this.cultivosRepository.save(updatedCultivo);

      return createSuccessResponse(this.toResponse(savedCultivo));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const cultivo = await this.findEntityById(id);

    if (!cultivo.isActive) {
      return createSuccessResponse(this.toResponse(cultivo));
    }

    cultivo.isActive = false;

    const savedCultivo = await this.cultivosRepository.save(cultivo);

    return createSuccessResponse(this.toResponse(savedCultivo));
  }

  private async findEntityById(id: string) {
    const cultivo = await this.cultivosRepository.findOne({
      where: { id }
    });

    if (!cultivo) {
      throw new NotFoundException("Cultivo not found.");
    }

    return cultivo;
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
        databaseError.constraint === "cultivos_codigo_key"
      ) {
        throw new ConflictException(
          "A crop with the same code already exists."
        );
      }

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "cultivos_nombre_key"
      ) {
        throw new ConflictException(
          "A crop with the same name already exists."
        );
      }
    }

    throw error;
  }

  private toResponse(cultivo: CultivoEntity) {
    return {
      id: cultivo.id,
      code: cultivo.code,
      name: cultivo.name,
      isActive: cultivo.isActive
    };
  }
}
