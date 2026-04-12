import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { IngredienteActivoEntity } from "../infrastructure/persistence/entities/ingrediente-activo.entity";
import { CreateIngredienteActivoDto } from "../presentation/dto/create-ingrediente-activo.dto";
import { UpdateIngredienteActivoDto } from "../presentation/dto/update-ingrediente-activo.dto";

@Injectable()
export class IngredientesActivosService {
  constructor(
    @InjectRepository(IngredienteActivoEntity)
    private readonly ingredientesActivosRepository: Repository<IngredienteActivoEntity>
  ) {}

  async create(createIngredienteActivoDto: CreateIngredienteActivoDto) {
    const ingredienteActivo = this.ingredientesActivosRepository.create({
      name: createIngredienteActivoDto.name,
      ...(createIngredienteActivoDto.isActive !== undefined
        ? { isActive: createIngredienteActivoDto.isActive }
        : {})
    });

    try {
      const savedIngredienteActivo =
        await this.ingredientesActivosRepository.save(ingredienteActivo);

      return createSuccessResponse(this.toResponse(savedIngredienteActivo));
    } catch (error) {
      this.handlePersistenceError(error, "create");
    }
  }

  async findAll() {
    const ingredientesActivos = await this.ingredientesActivosRepository.find({
      order: {
        name: "ASC"
      },
      take: 500
    });

    return createSuccessResponse(
      ingredientesActivos.map((ingredienteActivo) =>
        this.toResponse(ingredienteActivo)
      ),
      {
        count: ingredientesActivos.length
      }
    );
  }

  async findById(id: string) {
    const ingredienteActivo = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(ingredienteActivo));
  }

  async update(
    id: string,
    updateIngredienteActivoDto: UpdateIngredienteActivoDto
  ) {
    const ingredienteActivo = await this.findEntityById(id);
    const updatedIngredienteActivo = this.ingredientesActivosRepository.merge(
      ingredienteActivo,
      {
        ...(updateIngredienteActivoDto.name !== undefined
          ? { name: updateIngredienteActivoDto.name }
          : {}),
        ...(updateIngredienteActivoDto.isActive !== undefined
          ? { isActive: updateIngredienteActivoDto.isActive }
          : {})
      }
    );

    try {
      const savedIngredienteActivo =
        await this.ingredientesActivosRepository.save(updatedIngredienteActivo);

      return createSuccessResponse(this.toResponse(savedIngredienteActivo));
    } catch (error) {
      this.handlePersistenceError(error, "update");
    }
  }

  async remove(id: string) {
    const ingredienteActivo = await this.findEntityById(id);
    const updatedIngredienteActivo = this.ingredientesActivosRepository.merge(
      ingredienteActivo,
      {
        isActive: false
      }
    );

    try {
      const savedIngredienteActivo =
        await this.ingredientesActivosRepository.save(updatedIngredienteActivo);

      return createSuccessResponse(this.toResponse(savedIngredienteActivo));
    } catch (error) {
      this.handlePersistenceError(error, "delete");
    }
  }

  private async findEntityById(id: string) {
    const ingredienteActivo = await this.ingredientesActivosRepository.findOne({
      where: {
        id
      }
    });

    if (!ingredienteActivo) {
      throw new NotFoundException("Ingrediente activo not found.");
    }

    return ingredienteActivo;
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
        databaseError.constraint === "ingredientes_activos_nombre_key"
      ) {
        throw new ConflictException(
          "An active ingredient with the same name already exists."
        );
      }

      if (operation === "delete" && databaseError?.code === "23503") {
        throw new ConflictException("Cannot deactivate the active ingredient.");
      }
    }

    throw error;
  }

  private toResponse(ingredienteActivo: IngredienteActivoEntity) {
    return {
      id: ingredienteActivo.id,
      name: ingredienteActivo.name,
      isActive: ingredienteActivo.isActive
    };
  }
}
