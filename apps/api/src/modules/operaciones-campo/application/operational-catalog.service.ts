import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { QueryFailedError, Repository } from "typeorm";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { CreateOperationalCatalogDto } from "../presentation/dto/create-operational-catalog.dto";
import { UpdateOperationalCatalogDto } from "../presentation/dto/update-operational-catalog.dto";

type OperationalCatalogEntity = {
  id: string;
  name: string;
  description: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  optionCode?: string | null;
  optionLabel?: string | null;
  legend?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OperationalCatalogService<TEntity extends OperationalCatalogEntity> {
  constructor(
    private readonly repository: Repository<TEntity>,
    private readonly entityLabel: string,
    private readonly uniqueConstraintName: string
  ) {}

  async create(createDto: CreateOperationalCatalogDto) {
    const item = this.repository.create({
      name: createDto.name,
      description: createDto.description ?? null,
      categoryCode: createDto.categoryCode ?? null,
      categoryName: createDto.categoryName ?? null,
      optionCode: createDto.optionCode ?? null,
      optionLabel: createDto.optionLabel ?? null,
      legend: createDto.legend ?? null,
      sortOrder: createDto.sortOrder ?? null,
      isActive: createDto.isActive ?? true
    } as TEntity);

    try {
      const savedItem = await this.repository.save(item);

      return createSuccessResponse(this.toResponse(savedItem));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(pagination: PaginationQueryDto) {
    const [items, total] = await this.repository.findAndCount({
      order: {
        name: "ASC"
      } as never,
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      items.map((item) => this.toResponse(item)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const item = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(item));
  }

  async update(id: string, updateDto: UpdateOperationalCatalogDto) {
    const item = await this.findEntityById(id);
    const updatedItem = this.repository.merge(item, {
      ...(updateDto.name !== undefined ? { name: updateDto.name } : {}),
      ...(updateDto.description !== undefined
        ? { description: updateDto.description }
        : {}),
      ...(updateDto.categoryCode !== undefined
        ? { categoryCode: updateDto.categoryCode }
        : {}),
      ...(updateDto.categoryName !== undefined
        ? { categoryName: updateDto.categoryName }
        : {}),
      ...(updateDto.optionCode !== undefined
        ? { optionCode: updateDto.optionCode }
        : {}),
      ...(updateDto.optionLabel !== undefined
        ? { optionLabel: updateDto.optionLabel }
        : {}),
      ...(updateDto.legend !== undefined ? { legend: updateDto.legend } : {}),
      ...(updateDto.sortOrder !== undefined
        ? { sortOrder: updateDto.sortOrder }
        : {}),
      ...(updateDto.isActive !== undefined ? { isActive: updateDto.isActive } : {})
    } as TEntity);

    try {
      const savedItem = await this.repository.save(updatedItem);

      return createSuccessResponse(this.toResponse(savedItem));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const item = await this.findEntityById(id);

    if (!item.isActive) {
      return createSuccessResponse(this.toResponse(item));
    }

    item.isActive = false;

    try {
      const savedItem = await this.repository.save(item);

      return createSuccessResponse(this.toResponse(savedItem));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  private async findEntityById(id: string) {
    const item = await this.repository.findOne({
      where: { id } as never
    });

    if (!item) {
      throw new NotFoundException(`${this.entityLabel} not found.`);
    }

    return item;
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
        databaseError.constraint === this.uniqueConstraintName
      ) {
        throw new ConflictException(
          `${this.entityLabel} with the same name already exists.`
        );
      }
    }

    throw error;
  }

  private toResponse(item: TEntity) {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      categoryCode: item.categoryCode ?? null,
      categoryName: item.categoryName ?? null,
      optionCode: item.optionCode ?? null,
      optionLabel: item.optionLabel ?? null,
      legend: item.legend ?? null,
      sortOrder: item.sortOrder ?? null,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}
