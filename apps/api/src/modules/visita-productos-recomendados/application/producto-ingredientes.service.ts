import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { IngredienteActivoEntity } from "../infrastructure/persistence/entities/ingrediente-activo.entity";
import { ProductoIngredienteEntity } from "../infrastructure/persistence/entities/producto-ingrediente.entity";
import { ProductoEntity } from "../infrastructure/persistence/entities/producto.entity";
import { CreateProductoIngredienteDto } from "../presentation/dto/create-producto-ingrediente.dto";
import { FindProductoIngredientesQueryDto } from "../presentation/dto/find-producto-ingredientes-query.dto";
import { UpdateProductoIngredienteDto } from "../presentation/dto/update-producto-ingrediente.dto";

@Injectable()
export class ProductoIngredientesService {
  constructor(
    @InjectRepository(ProductoIngredienteEntity)
    private readonly productoIngredientesRepository: Repository<ProductoIngredienteEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productosRepository: Repository<ProductoEntity>,
    @InjectRepository(IngredienteActivoEntity)
    private readonly ingredientesActivosRepository: Repository<IngredienteActivoEntity>
  ) {}

  async create(createProductoIngredienteDto: CreateProductoIngredienteDto) {
    const producto = await this.findProductoById(createProductoIngredienteDto.productId);
    const ingredienteActivo = await this.findIngredienteActivoById(
      createProductoIngredienteDto.ingredientActiveId
    );

    const productoIngrediente = this.productoIngredientesRepository.create({
      productoId: producto.id,
      ingredientActiveId: ingredienteActivo.id,
      producto,
      ingredienteActivo
    });

    try {
      const savedProductoIngrediente =
        await this.productoIngredientesRepository.save(productoIngrediente);

      return createSuccessResponse(
        this.toResponse(savedProductoIngrediente, producto, ingredienteActivo)
      );
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindProductoIngredientesQueryDto) {
    const productoIngredientes = await this.productoIngredientesRepository.find({
      relations: {
        producto: true,
        ingredienteActivo: true
      },
      where: {
        ...(query.producto_id ? { productoId: query.producto_id } : {}),
        ...(query.ingrediente_activo_id
          ? { ingredientActiveId: query.ingrediente_activo_id }
          : {})
      },
      order: {
        producto: {
          name: "ASC"
        },
        ingredienteActivo: {
          name: "ASC"
        }
      },
      take: 500
    });

    return createSuccessResponse(
      productoIngredientes.map((productoIngrediente) =>
        this.toResponse(
          productoIngrediente,
          productoIngrediente.producto,
          productoIngrediente.ingredienteActivo
        )
      ),
      {
        count: productoIngredientes.length
      }
    );
  }

  async update(
    productoId: string,
    ingredientActiveId: string,
    updateProductoIngredienteDto: UpdateProductoIngredienteDto
  ) {
    const currentProductoIngrediente = await this.findEntityByIds(
      productoId,
      ingredientActiveId
    );

    const nextProductId =
      updateProductoIngredienteDto.productId ?? currentProductoIngrediente.productoId;
    const nextIngredientActiveId =
      updateProductoIngredienteDto.ingredientActiveId ??
      currentProductoIngrediente.ingredientActiveId;

    const producto = await this.findProductoById(nextProductId);
    const ingredienteActivo =
      await this.findIngredienteActivoById(nextIngredientActiveId);

    if (
      nextProductId === currentProductoIngrediente.productoId &&
      nextIngredientActiveId === currentProductoIngrediente.ingredientActiveId
    ) {
      return createSuccessResponse(
        this.toResponse(currentProductoIngrediente, producto, ingredienteActivo)
      );
    }

    const nextProductoIngrediente = this.productoIngredientesRepository.create({
      productoId: producto.id,
      ingredientActiveId: ingredienteActivo.id,
      producto,
      ingredienteActivo
    });

    try {
      const savedProductoIngrediente =
        await this.productoIngredientesRepository.save(nextProductoIngrediente);

      await this.productoIngredientesRepository.remove(currentProductoIngrediente);

      return createSuccessResponse(
        this.toResponse(savedProductoIngrediente, producto, ingredienteActivo)
      );
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(productoId: string, ingredientActiveId: string) {
    const productoIngrediente = await this.findEntityByIds(
      productoId,
      ingredientActiveId
    );

    await this.productoIngredientesRepository.remove(productoIngrediente);

    return createSuccessResponse(
      this.toResponse(
        productoIngrediente,
        productoIngrediente.producto,
        productoIngrediente.ingredienteActivo
      )
    );
  }

  private async findEntityByIds(productoId: string, ingredientActiveId: string) {
    const productoIngrediente = await this.productoIngredientesRepository.findOne({
      relations: {
        producto: true,
        ingredienteActivo: true
      },
      where: {
        productoId,
        ingredientActiveId
      }
    });

    if (!productoIngrediente) {
      throw new NotFoundException("Producto ingrediente not found.");
    }

    return productoIngrediente;
  }

  private async findProductoById(id: string) {
    const producto = await this.productosRepository.findOne({
      where: {
        id
      }
    });

    if (!producto) {
      throw new NotFoundException("Producto not found.");
    }

    return producto;
  }

  private async findIngredienteActivoById(id: string) {
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
        databaseError.constraint === "producto_ingredientes_pkey"
      ) {
        throw new ConflictException(
          "The product is already linked to the active ingredient."
        );
      }
    }

    throw error;
  }

  private toResponse(
    productoIngrediente: ProductoIngredienteEntity,
    producto: ProductoEntity,
    ingredienteActivo: IngredienteActivoEntity
  ) {
    return {
      productId: productoIngrediente.productoId,
      ingredientActiveId: productoIngrediente.ingredientActiveId,
      product: {
        id: producto.id,
        name: producto.name,
        isActive: producto.isActive
      },
      ingredientActive: {
        id: ingredienteActivo.id,
        name: ingredienteActivo.name,
        isActive: ingredienteActivo.isActive
      }
    };
  }
}
