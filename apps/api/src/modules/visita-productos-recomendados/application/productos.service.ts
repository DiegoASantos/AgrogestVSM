import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { ProductoEntity } from "../infrastructure/persistence/entities/producto.entity";
import { CreateProductoDto } from "../presentation/dto/create-producto.dto";
import { UpdateProductoDto } from "../presentation/dto/update-producto.dto";

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly productosRepository: Repository<ProductoEntity>
  ) {}

  async create(createProductoDto: CreateProductoDto) {
    const producto = this.productosRepository.create({
      name: createProductoDto.name,
      ...(createProductoDto.isActive !== undefined
        ? { isActive: createProductoDto.isActive }
        : {})
    });

    try {
      const savedProducto = await this.productosRepository.save(producto);

      return createSuccessResponse(this.toResponse(savedProducto));
    } catch (error) {
      this.handlePersistenceError(error, "create");
    }
  }

  async findAll() {
    const productos = await this.productosRepository.find({
      order: {
        name: "ASC"
      },
      take: 500
    });

    return createSuccessResponse(
      productos.map((producto) => this.toResponse(producto)),
      {
        count: productos.length
      }
    );
  }

  async findById(id: string) {
    const producto = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(producto));
  }

  async update(id: string, updateProductoDto: UpdateProductoDto) {
    const producto = await this.findEntityById(id);
    const updatedProducto = this.productosRepository.merge(producto, {
      ...(updateProductoDto.name !== undefined
        ? { name: updateProductoDto.name }
        : {}),
      ...(updateProductoDto.isActive !== undefined
        ? { isActive: updateProductoDto.isActive }
        : {})
    });

    try {
      const savedProducto = await this.productosRepository.save(updatedProducto);

      return createSuccessResponse(this.toResponse(savedProducto));
    } catch (error) {
      this.handlePersistenceError(error, "update");
    }
  }

  async remove(id: string) {
    const producto = await this.findEntityById(id);
    const updatedProducto = this.productosRepository.merge(producto, {
      isActive: false
    });

    try {
      const savedProducto = await this.productosRepository.save(updatedProducto);

      return createSuccessResponse(this.toResponse(savedProducto));
    } catch (error) {
      this.handlePersistenceError(error, "delete");
    }
  }

  private async findEntityById(id: string) {
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
        databaseError.constraint === "productos_nombre_key"
      ) {
        throw new ConflictException(
          "A product with the same name already exists."
        );
      }

      if (operation === "delete" && databaseError?.code === "23503") {
        throw new ConflictException("Cannot deactivate the product.");
      }
    }

    throw error;
  }

  private toResponse(producto: ProductoEntity) {
    return {
      id: producto.id,
      name: producto.name,
      isActive: producto.isActive
    };
  }
}
