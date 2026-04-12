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
import { TipoDocumentoEntity } from "../infrastructure/persistence/entities/tipo-documento.entity";
import { CreateTipoDocumentoDto } from "../presentation/dto/create-tipo-documento.dto";
import { UpdateTipoDocumentoDto } from "../presentation/dto/update-tipo-documento.dto";

@Injectable()
export class TiposDocumentoService {
  constructor(
    @InjectRepository(TipoDocumentoEntity)
    private readonly tiposDocumentoRepository: Repository<TipoDocumentoEntity>
  ) {}

  async create(createTipoDocumentoDto: CreateTipoDocumentoDto) {
    const tipoDocumento = this.tiposDocumentoRepository.create({
      code: createTipoDocumentoDto.code,
      name: createTipoDocumentoDto.name
    });

    try {
      const savedTipoDocumento =
        await this.tiposDocumentoRepository.save(tipoDocumento);

      return createSuccessResponse(this.toResponse(savedTipoDocumento));
    } catch (error) {
      this.handlePersistenceError(error, "create");
    }
  }

  async findAll(pagination: PaginationQueryDto) {
    const [tiposDocumento, total] =
      await this.tiposDocumentoRepository.findAndCount({
        order: {
          name: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      tiposDocumento.map((tipoDocumento) => this.toResponse(tipoDocumento)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const tipoDocumento = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(tipoDocumento));
  }

  async update(id: string, updateTipoDocumentoDto: UpdateTipoDocumentoDto) {
    const tipoDocumento = await this.findEntityById(id);
    const updatedTipoDocumento = this.tiposDocumentoRepository.merge(
      tipoDocumento,
      {
        ...(updateTipoDocumentoDto.code !== undefined
          ? { code: updateTipoDocumentoDto.code }
          : {}),
        ...(updateTipoDocumentoDto.name !== undefined
          ? { name: updateTipoDocumentoDto.name }
          : {})
      }
    );

    try {
      const savedTipoDocumento = await this.tiposDocumentoRepository.save(
        updatedTipoDocumento
      );

      return createSuccessResponse(this.toResponse(savedTipoDocumento));
    } catch (error) {
      this.handlePersistenceError(error, "update");
    }
  }

  async remove(id: string) {
    const tipoDocumento = await this.findEntityById(id);

    try {
      await this.tiposDocumentoRepository.remove(tipoDocumento);

      return createSuccessResponse(this.toResponse(tipoDocumento));
    } catch (error) {
      this.handlePersistenceError(error, "delete");
    }
  }

  private async findEntityById(id: string) {
    const tipoDocumento = await this.tiposDocumentoRepository.findOne({
      where: { id: Number(id) }
    });

    if (!tipoDocumento) {
      throw new NotFoundException("Tipo documento not found.");
    }

    return tipoDocumento;
  }

  private handlePersistenceError(
    error: unknown,
    operation: "create" | "update" | "delete"
  ): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "tipos_documento_codigo_key"
      ) {
        throw new ConflictException(
          "A document type with the same code already exists."
        );
      }

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "tipos_documento_nombre_key"
      ) {
        throw new ConflictException(
          "A document type with the same name already exists."
        );
      }

      if (operation === "delete" && databaseError?.code === "23503") {
        throw new ConflictException(
          "Cannot delete the document type because it is in use."
        );
      }
    }

    throw error;
  }

  private toResponse(tipoDocumento: TipoDocumentoEntity) {
    return {
      id: tipoDocumento.id,
      code: tipoDocumento.code,
      name: tipoDocumento.name
    };
  }
}
