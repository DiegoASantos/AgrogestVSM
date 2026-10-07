import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, QueryFailedError } from "typeorm";
import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import type { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import {
  CreateAdminAcreedorCosechaDto,
  UpdateAdminAcreedorCosechaDto
} from "../presentation/dto/upsert-admin-acreedor-cosecha.dto";

@Injectable()
export class AdminAcreedoresCosechaService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(pagination: PaginationQueryDto, search?: string) {
    const query = this.dataSource
      .getRepository(AcreedorCosechaEntity)
      .createQueryBuilder("creditor")
      .leftJoinAndSelect("creditor.productor", "productor")
      .orderBy("creditor.createdAt", "DESC")
      .addOrderBy("creditor.id", "DESC")
      .skip(pagination.skip)
      .take(pagination.take);
    if (search?.trim()) {
      query.andWhere(
        "LOWER(creditor.creditorFirstName || ' ' || creditor.creditorLastName || ' ' || productor.firstName || ' ' || productor.lastName) LIKE :search",
        { search: `%${search.trim().toLowerCase()}%` }
      );
    }
    const [creditors, total] = await query.getManyAndCount();
    return createSuccessResponse(
      creditors.map((creditor) => this.toResponse(creditor)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findOne(id: string) {
    return createSuccessResponse(this.toResponse(await this.findEntity(id)));
  }

  async create(dto: CreateAdminAcreedorCosechaDto, userId: string) {
    this.assertDocumentNumber(dto.tipoDocumento, dto.nroDocumento);
    const producer = await this.findProducer(dto.productorId);
    const repository = this.dataSource.getRepository(AcreedorCosechaEntity);
    const creditor = repository.create({
      productorId: producer.id,
      creditorFirstName: dto.nombres,
      creditorLastName: dto.apellidos,
      creditorDocumentType: dto.tipoDocumento,
      creditorDocumentNumber: dto.nroDocumento,
      bank: dto.banco,
      accountNumber: dto.nroCuenta,
      createdByUserId: userId,
      approvalStatus: "PENDING",
      source: "ADMIN_WEB"
    });
    try {
      return createSuccessResponse(this.toResponse(await repository.save(creditor)));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async update(id: string, dto: UpdateAdminAcreedorCosechaDto) {
    const repository = this.dataSource.getRepository(AcreedorCosechaEntity);
    const creditor = await this.findEntity(id);
    const documentType = dto.tipoDocumento ?? creditor.creditorDocumentType;
    const documentNumber = dto.nroDocumento ?? creditor.creditorDocumentNumber;
    this.assertDocumentNumber(documentType, documentNumber);
    const producer = dto.productorId ? await this.findProducer(dto.productorId) : null;
    Object.assign(creditor, {
      ...(producer ? { productorId: producer.id } : {}),
      ...(dto.nombres !== undefined ? { creditorFirstName: dto.nombres } : {}),
      ...(dto.apellidos !== undefined ? { creditorLastName: dto.apellidos } : {}),
      ...(dto.tipoDocumento !== undefined
        ? { creditorDocumentType: dto.tipoDocumento }
        : {}),
      ...(dto.nroDocumento !== undefined
        ? { creditorDocumentNumber: dto.nroDocumento }
        : {}),
      ...(dto.banco !== undefined ? { bank: dto.banco } : {}),
      ...(dto.nroCuenta !== undefined ? { accountNumber: dto.nroCuenta } : {}),
      ...(creditor.approvalStatus === "APPROVED"
        ? {
            approvalStatus: "PENDING",
            reviewedByUserId: null,
            reviewedAt: null,
            reviewObservation: null
          }
        : {}),
      updatedAt: new Date()
    });
    try {
      return createSuccessResponse(this.toResponse(await repository.save(creditor)));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const creditor = await this.findEntity(id);
    const [harvestReferences, paymentReferences, reviewReferences] = await Promise.all([
      this.dataSource.query(
        "SELECT EXISTS (SELECT 1 FROM registros_cosecha WHERE acreedor_id = $1) AS exists",
        [creditor.id]
      ),
      this.dataSource.query(
        "SELECT EXISTS (SELECT 1 FROM detalle_pago_productores WHERE acreedor_id = $1) AS exists",
        [creditor.id]
      ),
      this.dataSource.query(
        "SELECT EXISTS (SELECT 1 FROM revisiones_acreedor_cosecha WHERE acreedor_id = $1) AS exists",
        [creditor.id]
      )
    ]);
    if (
      harvestReferences[0]?.exists ||
      paymentReferences[0]?.exists ||
      reviewReferences[0]?.exists
    ) {
      throw new ConflictException(
        "No se puede eliminar un acreedor que tiene pagos, cosechas o historial de revisión."
      );
    }
    try {
      await this.dataSource.getRepository(AcreedorCosechaEntity).remove(creditor);
      return createSuccessResponse({ id, eliminado: true });
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  private async findProducer(publicId: string) {
    const producer = await this.dataSource
      .getRepository(ProductorEntity)
      .findOne({ where: { publicId } });
    if (!producer) throw new NotFoundException("Productor no encontrado.");
    return producer;
  }

  private async findEntity(publicId: string) {
    const creditor = await this.dataSource
      .getRepository(AcreedorCosechaEntity)
      .findOne({ where: { publicId }, relations: { productor: true } });
    if (!creditor) throw new NotFoundException("Acreedor de cosecha no encontrado.");
    return creditor;
  }

  private toResponse(creditor: AcreedorCosechaEntity) {
    return {
      id: creditor.publicId,
      publicId: creditor.publicId,
      productorId: creditor.productor?.publicId,
      productorNombre: creditor.productor
        ? [creditor.productor.firstName, creditor.productor.lastName]
            .filter(Boolean)
            .join(" ") || creditor.productor.entityType
        : "",
      nombres: creditor.creditorFirstName,
      apellidos: creditor.creditorLastName,
      tipoDocumento: creditor.creditorDocumentType,
      nroDocumento: creditor.creditorDocumentNumber,
      banco: creditor.bank,
      nroCuenta: creditor.accountNumber,
      estadoAprobacion: creditor.approvalStatus,
      origen: creditor.source,
      observacionRevision: creditor.reviewObservation,
      creadoAt: creditor.createdAt,
      actualizadoAt: creditor.updatedAt
    };
  }

  private assertDocumentNumber(type: string, number: string) {
    const expected = type === "DNI" ? 8 : 11;
    if (number.length !== expected)
      throw new ConflictException(`El ${type} debe tener ${expected} dígitos.`);
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const code = (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code;
      if (code === "23505")
        throw new ConflictException(
          "Ya existe un acreedor con esos datos para el productor."
        );
      if (code === "23503")
        throw new ConflictException(
          "El acreedor tiene referencias y no puede eliminarse."
        );
    }
    throw error;
  }
}
