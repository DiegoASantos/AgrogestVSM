import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, type EntityManager } from "typeorm";
import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import type { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import { TipoDocumentoEntity } from "../../tipos-documento/infrastructure/persistence/entities/tipo-documento.entity";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import { RevisionAcreedorCosechaEntity } from "../infrastructure/persistence/entities/revision-acreedor-cosecha.entity";
import { DetallePagoProductorEntity } from "../infrastructure/persistence/entities/detalle-pago-productor.entity";
import {
  PagoProductorEntity,
  PAGO_PRODUCTOR_STATUSES
} from "../infrastructure/persistence/entities/pago-productor.entity";
import {
  CreateDetallePagoProductorDto,
  UpdateDetallePagoProductorDto
} from "../presentation/dto/create-detalle-pago-productor.dto";
import { CreatePagoProductorDto } from "../presentation/dto/create-pago-productor.dto";
import { UpdatePagoProductorDto } from "../presentation/dto/update-pago-productor.dto";
import type { GuardarDetallesPagoProductorDto } from "../presentation/dto/guardar-detalles-pago-productor.dto";
import type { CrearAcreedorAprobadoPagoDto } from "../presentation/dto/crear-acreedor-aprobado-pago.dto";
import type {
  CrearPagoCompletoDto,
  EditarPagoCompletoDto,
  DetallePagoCompletoDto
} from "../presentation/dto/pago-productor-completo.dto";

@Injectable()
export class PagosProductoresService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async catalogs() {
    const [producers, users, documents] = await Promise.all([
      this.dataSource.getRepository(ProductorEntity).find({
        select: {
          id: true,
          publicId: true,
          entityType: true,
          firstName: true,
          lastName: true,
          isActive: true
        },
        order: { firstName: "ASC", lastName: "ASC" }
      }),
      this.dataSource
        .getRepository(UserEntity)
        .createQueryBuilder("user")
        .select(["user.id", "user.publicId", "user.firstName", "user.lastName"])
        .innerJoin("user.userRoles", "userRole")
        .innerJoin("userRole.role", "role", "role.code = :roleCode", {
          roleCode: "AGRONOMO"
        })
        .where("user.isActive = true")
        .orderBy("user.lastName", "ASC")
        .addOrderBy("user.firstName", "ASC")
        .getMany(),
      this.dataSource
        .getRepository(TipoDocumentoEntity)
        .find({ select: { id: true, code: true, name: true }, order: { name: "ASC" } })
    ]);
    return createSuccessResponse({
      productores: producers.map((producer) => ({
        id: producer.publicId,
        nombre:
          [producer.firstName, producer.lastName].filter(Boolean).join(" ") ||
          producer.entityType,
        activo: producer.isActive
      })),
      supervisores: users.map((user) => ({
        id: user.publicId,
        nombre: `${user.firstName} ${user.lastName}`.trim()
      })),
      tiposDocumento: documents.map((document) => ({
        codigo: document.code,
        nombre: document.name
      }))
    });
  }

  async list(query: PaginationQueryDto, producerId?: string, status?: string) {
    if (status && !(PAGO_PRODUCTOR_STATUSES as readonly string[]).includes(status))
      throw new BadRequestException("Estado de pago no válido.");
    const repository = this.dataSource.getRepository(PagoProductorEntity);
    const builder = repository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.productor", "productor")
      .orderBy("payment.createdAt", "DESC")
      .addOrderBy("payment.id", "DESC")
      .skip(query.skip)
      .take(query.take);
    if (producerId) builder.andWhere("productor.public_id = :producerId", { producerId });
    if (status) builder.andWhere("payment.status = :status", { status });
    const [payments, total] = await builder.getManyAndCount();
    return createSuccessResponse(
      payments.map((payment) => this.toPaymentResponse(payment)),
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async findOne(id: string) {
    const payment = await this.findPayment(id);
    return createSuccessResponse({
      ...this.toPaymentResponse(payment),
      detalles: await this.listDetailsForEntity(payment)
    });
  }

  async create(dto: CreatePagoProductorDto, userId: string) {
    try {
      const saved = await this.dataSource.transaction((manager) =>
        this.createPaymentWithinTransaction(manager, dto, userId)
      );
      return createSuccessResponse(
        this.toPaymentResponse(await this.findPayment(saved.publicId))
      );
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  async createComplete(dto: CrearPagoCompletoDto, userId: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const payment = await this.createPaymentWithinTransaction(
          manager,
          dto.cabecera,
          userId
        );
        const details = await this.saveDetailsWithinTransaction(
          manager,
          payment,
          dto.detalles,
          [],
          true
        );
        return createSuccessResponse({
          ...this.toPaymentResponse(await this.findPayment(payment.publicId, manager)),
          detalles: details
        });
      });
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  private async createPaymentWithinTransaction(
    manager: EntityManager,
    dto: CreatePagoProductorDto,
    userId: string
  ) {
    const repository = manager.getRepository(PagoProductorEntity);
    const producer = await this.findProducerByPublicId(dto.productorId, manager);
    const payment = repository.create({
      productorId: producer.id,
      sourceSystem: dto.sistemaOrigen,
      guideNumber: dto.nroGuia,
      lot: dto.lote,
      protocol: dto.protocolo,
      variety: dto.variedad,
      cropType: dto.tipoCultivo,
      category: dto.categoria,
      destination: dto.destino,
      harvestDate: dto.fechaCosecha,
      harvestReceptionDate: dto.fechaRecepcion,
      crateQuantity: dto.jabas,
      grossWeight: dto.pesoBruto,
      tareWeight: dto.pesoTara,
      netWeight: dto.pesoNeto,
      averageWeight: dto.pesoPromedio,
      exporter: dto.exportador,
      sourceProducerCode: dto.codigoProductorOrigen,
      sourceProducerName: dto.nombreProductorOrigen,
      status: "BORRADOR",
      createdByUserId: userId
    });
    this.assertDates(payment.harvestDate, payment.harvestReceptionDate);
    return repository.save(payment);
  }

  async update(id: string, dto: UpdatePagoProductorDto) {
    return this.dataSource.transaction(async (manager) => {
      const saved = await this.updatePaymentWithinTransaction(manager, id, dto);
      return createSuccessResponse(
        this.toPaymentResponse(await this.findPayment(saved.publicId, manager))
      );
    });
  }

  async updateComplete(id: string, dto: EditarPagoCompletoDto) {
    if (dto.cabecera.estado === "ANULADO")
      throw new BadRequestException("Anula el pago desde el listado.");
    try {
      return await this.dataSource.transaction(async (manager) => {
        const payment = await this.updatePaymentWithinTransaction(
          manager,
          id,
          dto.cabecera
        );
        const details = await this.saveDetailsWithinTransaction(
          manager,
          payment,
          dto.detalles,
          dto.anularIds ?? [],
          true
        );
        return createSuccessResponse({
          ...this.toPaymentResponse(await this.findPayment(payment.publicId, manager)),
          detalles: details
        });
      });
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  private async updatePaymentWithinTransaction(
    manager: EntityManager,
    id: string,
    dto: UpdatePagoProductorDto
  ) {
    const repository = manager.getRepository(PagoProductorEntity);
    const payment = await this.findPayment(id, manager);
    if (payment.status === "ANULADO")
      throw new ConflictException("No se puede modificar un pago anulado.");
    const nextProducer = dto.productorId
      ? await this.findProducerByPublicId(dto.productorId, manager)
      : null;
    if (nextProducer && nextProducer.id !== payment.productorId) {
      const detailCount = await manager
        .getRepository(DetallePagoProductorEntity)
        .count({ where: { paymentId: payment.id } });
      if (detailCount > 0)
        throw new ConflictException(
          "No se puede cambiar el productor de un pago que ya tiene detalles."
        );
    }
    Object.assign(payment, {
      ...(nextProducer ? { productorId: nextProducer.id } : {}),
      ...(dto.sistemaOrigen !== undefined ? { sourceSystem: dto.sistemaOrigen } : {}),
      ...(dto.nroGuia !== undefined ? { guideNumber: dto.nroGuia } : {}),
      ...(dto.lote !== undefined ? { lot: dto.lote } : {}),
      ...(dto.protocolo !== undefined ? { protocol: dto.protocolo } : {}),
      ...(dto.variedad !== undefined ? { variety: dto.variedad } : {}),
      ...(dto.tipoCultivo !== undefined ? { cropType: dto.tipoCultivo } : {}),
      ...(dto.categoria !== undefined ? { category: dto.categoria } : {}),
      ...(dto.destino !== undefined ? { destination: dto.destino } : {}),
      ...(dto.fechaCosecha !== undefined ? { harvestDate: dto.fechaCosecha } : {}),
      ...(dto.fechaRecepcion !== undefined
        ? { harvestReceptionDate: dto.fechaRecepcion }
        : {}),
      ...(dto.jabas !== undefined ? { crateQuantity: dto.jabas } : {}),
      ...(dto.pesoBruto !== undefined ? { grossWeight: dto.pesoBruto } : {}),
      ...(dto.pesoTara !== undefined ? { tareWeight: dto.pesoTara } : {}),
      ...(dto.pesoNeto !== undefined ? { netWeight: dto.pesoNeto } : {}),
      ...(dto.pesoPromedio !== undefined ? { averageWeight: dto.pesoPromedio } : {}),
      ...(dto.exportador !== undefined ? { exporter: dto.exportador } : {}),
      ...(dto.codigoProductorOrigen !== undefined
        ? { sourceProducerCode: dto.codigoProductorOrigen }
        : {}),
      ...(dto.nombreProductorOrigen !== undefined
        ? { sourceProducerName: dto.nombreProductorOrigen }
        : {}),
      ...(dto.estado ? { status: dto.estado } : {}),
      updatedAt: new Date()
    });
    this.assertDates(payment.harvestDate, payment.harvestReceptionDate);
    const saved = await repository.save(payment);
    if (dto.estado === "ANULADO") {
      await manager
        .getRepository(DetallePagoProductorEntity)
        .update({ paymentId: saved.id }, { status: "ANULADO", updatedAt: new Date() });
    }
    return saved;
  }

  async remove(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(PagoProductorEntity);
      const payment = await this.findPayment(id, manager);
      const detailCount = await manager
        .getRepository(DetallePagoProductorEntity)
        .count({ where: { paymentId: payment.id } });
      if (payment.status === "BORRADOR" && detailCount === 0) {
        await payments.remove(payment);
        return createSuccessResponse({ id, eliminado: true });
      }
      await manager
        .getRepository(DetallePagoProductorEntity)
        .update({ paymentId: payment.id }, { status: "ANULADO", updatedAt: new Date() });
      payment.status = "ANULADO";
      payment.updatedAt = new Date();
      const saved = await payments.save(payment);
      return createSuccessResponse({
        ...this.toPaymentResponse(saved),
        eliminado: false
      });
    });
  }

  async listDetails(paymentId: string) {
    const payment = await this.findPayment(paymentId);
    return createSuccessResponse(await this.listDetailsForEntity(payment));
  }

  async approvedCreditors(paymentId: string) {
    const payment = await this.findPayment(paymentId);
    return this.approvedCreditorsForInternalProducer(payment.productorId);
  }

  async approvedCreditorsByProducer(producerId: string) {
    const producer = await this.findProducerByPublicId(producerId);
    return this.approvedCreditorsForInternalProducer(producer.id);
  }

  private async approvedCreditorsForInternalProducer(producerId: string) {
    const creditors = await this.dataSource.getRepository(AcreedorCosechaEntity).find({
      where: { productorId: producerId, approvalStatus: "APPROVED" },
      order: { creditorLastName: "ASC", creditorFirstName: "ASC" }
    });
    return createSuccessResponse(
      creditors.map((creditor) => ({
        id: creditor.publicId,
        nombre: `${creditor.creditorFirstName} ${creditor.creditorLastName}`.trim(),
        tipoDocumento: creditor.creditorDocumentType,
        nroDocumento: creditor.creditorDocumentNumber
      }))
    );
  }

  async createApprovedCreditor(
    paymentId: string,
    dto: CrearAcreedorAprobadoPagoDto,
    userId: string
  ) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const payment = await this.findPayment(paymentId, manager);
        if (payment.status === "ANULADO")
          throw new ConflictException(
            "No se pueden agregar acreedores a un pago anulado."
          );
        const expected = dto.tipoDocumento === "DNI" ? 8 : 11;
        if (dto.nroDocumento.length !== expected)
          throw new BadRequestException(
            `El ${dto.tipoDocumento} debe tener ${expected} dígitos.`
          );
        const creditors = manager.getRepository(AcreedorCosechaEntity);
        const creditor = creditors.create({
          productorId: payment.productorId,
          creditorFirstName: dto.nombres,
          creditorLastName: dto.apellidos,
          creditorDocumentType: dto.tipoDocumento,
          creditorDocumentNumber: dto.nroDocumento,
          bank: dto.banco,
          accountNumber: dto.nroCuenta,
          createdByUserId: userId,
          approvalStatus: "APPROVED",
          source: "ADMIN_WEB",
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          reviewObservation: null
        });
        const saved = await creditors.save(creditor);
        await manager.getRepository(RevisionAcreedorCosechaEntity).save({
          creditorId: saved.id,
          reviewerUserId: userId,
          decision: "APPROVED",
          observation: "Aprobado al registrarse desde pagos."
        });
        return createSuccessResponse({
          id: saved.publicId,
          nombre: `${saved.creditorFirstName} ${saved.creditorLastName}`.trim(),
          tipoDocumento: saved.creditorDocumentType,
          nroDocumento: saved.creditorDocumentNumber
        });
      });
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  async saveDetailsBatch(paymentId: string, dto: GuardarDetallesPagoProductorDto) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.findPayment(paymentId, manager);
      const rows: DetallePagoCompletoDto[] = [
        ...(dto.actualizar ?? []),
        ...(dto.crear ?? [])
      ];
      return createSuccessResponse(
        await this.saveDetailsWithinTransaction(
          manager,
          payment,
          rows,
          dto.anularIds ?? [],
          false
        )
      );
    });
  }

  private async saveDetailsWithinTransaction(
    manager: EntityManager,
    payment: PagoProductorEntity,
    rows: DetallePagoCompletoDto[],
    annulIds: string[],
    requireActive: boolean
  ) {
    if (payment.status === "ANULADO")
      throw new ConflictException("No se pueden modificar detalles de un pago anulado.");
    const repository = manager.getRepository(DetallePagoProductorEntity);
    const incomingIds = new Set<string>();
    for (const [index, item] of rows.entries()) {
      let existing: DetallePagoProductorEntity | null = null;
      if (item.id) {
        if (incomingIds.has(item.id))
          throw new BadRequestException("Un detalle aparece más de una vez.");
        incomingIds.add(item.id);
        existing = await repository.findOne({
          where: { publicId: item.id, paymentId: payment.id }
        });
        if (!existing || existing.status === "ANULADO")
          throw new ConflictException("Uno de los detalles ya no está disponible.");
      }
      try {
        if (existing) {
          const replacement = await this.buildDetail(manager, payment, item);
          this.copyDetailFields(existing, replacement);
          existing.status = item.estado ?? existing.status;
          existing.updatedAt = new Date();
          await repository.save(existing);
        } else {
          await repository.save(await this.buildDetail(manager, payment, item));
        }
      } catch (error) {
        throw this.batchDetailError(error, index + 1);
      }
    }
    const annulledIds = new Set<string>();
    for (const id of annulIds) {
      if (incomingIds.has(id))
        throw new BadRequestException("No se puede editar y anular el mismo detalle.");
      if (annulledIds.has(id))
        throw new BadRequestException("Un detalle se anuló más de una vez.");
      annulledIds.add(id);
      const detail = await repository.findOne({
        where: { publicId: id, paymentId: payment.id }
      });
      if (!detail) throw new NotFoundException("Detalle de pago no encontrado.");
      detail.status = "ANULADO";
      detail.updatedAt = new Date();
      await repository.save(detail);
    }
    const details = await this.listDetailsWithinTransaction(payment, manager);
    if (requireActive && !details.some((detail) => detail.estado !== "ANULADO"))
      throw new BadRequestException(
        "Agrega al menos un detalle activo antes de guardar."
      );
    if (
      payment.status === "BORRADOR" &&
      details.some((detail) => detail.estado !== "ANULADO")
    ) {
      payment.status = "PENDIENTE";
      payment.updatedAt = new Date();
      await manager.getRepository(PagoProductorEntity).save(payment);
    }
    return details;
  }

  async createDetail(paymentId: string, dto: CreateDetallePagoProductorDto) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.findPayment(paymentId, manager);
      if (payment.status === "ANULADO")
        throw new ConflictException("No se pueden agregar detalles a un pago anulado.");
      const existingDetails = await manager
        .getRepository(DetallePagoProductorEntity)
        .count({ where: { paymentId: payment.id } });
      const detail = await this.buildDetail(manager, payment, dto);
      const saved = await manager.getRepository(DetallePagoProductorEntity).save(detail);
      if (payment.status === "BORRADOR" && existingDetails === 0) {
        payment.status = "PENDIENTE";
        payment.updatedAt = new Date();
        await manager.getRepository(PagoProductorEntity).save(payment);
      }
      return createSuccessResponse(await this.toDetailResponse(saved, manager));
    });
  }

  async updateDetail(
    paymentId: string,
    detailId: string,
    dto: UpdateDetallePagoProductorDto
  ) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.findPayment(paymentId, manager);
      if (payment.status === "ANULADO")
        throw new ConflictException(
          "No se pueden modificar detalles de un pago anulado."
        );
      const detail = await manager
        .getRepository(DetallePagoProductorEntity)
        .findOne({ where: { publicId: detailId, paymentId: payment.id } });
      if (!detail) throw new NotFoundException("Detalle de pago no encontrado.");
      if (detail.status === "ANULADO")
        throw new ConflictException("No se puede modificar un detalle anulado.");
      const replacement = await this.buildDetail(manager, payment, dto);
      Object.assign(detail, {
        creditorId: replacement.creditorId,
        producerDocumentTypeId: replacement.producerDocumentTypeId,
        producerDocumentNumber: replacement.producerDocumentNumber,
        crateQuantity: replacement.crateQuantity,
        cratePrice: replacement.cratePrice,
        kiloPrice: replacement.kiloPrice,
        weightPercentage: replacement.weightPercentage,
        fairtradeApplies: replacement.fairtradeApplies,
        supervisorId: replacement.supervisorId,
        subtotal: replacement.subtotal,
        discountType: replacement.discountType,
        discountAmount: replacement.discountAmount,
        totalAfterDiscount: replacement.totalAfterDiscount,
        withholdingAmount: replacement.withholdingAmount,
        totalAfterWithholding: replacement.totalAfterWithholding,
        settlementNumber: replacement.settlementNumber,
        observation: replacement.observation,
        status: dto.estado ?? detail.status,
        updatedAt: new Date()
      });
      return createSuccessResponse(
        await this.toDetailResponse(
          await manager.getRepository(DetallePagoProductorEntity).save(detail),
          manager
        )
      );
    });
  }

  async removeDetail(paymentId: string, detailId: string) {
    const payment = await this.findPayment(paymentId);
    const repository = this.dataSource.getRepository(DetallePagoProductorEntity);
    const detail = await repository.findOne({
      where: { publicId: detailId, paymentId: payment.id }
    });
    if (!detail) throw new NotFoundException("Detalle de pago no encontrado.");
    detail.status = "ANULADO";
    detail.updatedAt = new Date();
    return createSuccessResponse(
      await this.toDetailResponse(await repository.save(detail))
    );
  }

  private async buildDetail(
    manager: EntityManager,
    payment: PagoProductorEntity,
    dto: CreateDetallePagoProductorDto
  ) {
    const weightPercentage = Number(dto.porcentajePeso);
    if (
      !Number.isFinite(weightPercentage) ||
      weightPercentage < 0 ||
      weightPercentage > 100
    ) {
      throw new BadRequestException("El porcentaje de peso debe estar entre 0 y 100.");
    }
    const creditor = await manager
      .getRepository(AcreedorCosechaEntity)
      .findOne({ where: { publicId: dto.acreedorId } });
    if (!creditor || creditor.productorId !== payment.productorId)
      throw new NotFoundException(
        "Acreedor no disponible para el productor seleccionado."
      );
    if (creditor.approvalStatus !== "APPROVED")
      throw new ConflictException(
        "El acreedor debe estar aprobado para asignarlo al pago."
      );
    const documentType = await manager
      .getRepository(TipoDocumentoEntity)
      .findOne({ where: { code: creditor.creditorDocumentType } });
    if (!documentType)
      throw new BadRequestException("Tipo de documento del productor no válido.");
    const expectedDocumentLength =
      creditor.creditorDocumentType === "DNI"
        ? 8
        : creditor.creditorDocumentType === "RUC"
          ? 11
          : null;
    if (
      expectedDocumentLength &&
      creditor.creditorDocumentNumber.length !== expectedDocumentLength
    )
      throw new BadRequestException(
        `El ${creditor.creditorDocumentType} debe tener ${expectedDocumentLength} dígitos.`
      );
    const supervisor = await manager
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .select(["user.id", "user.publicId", "user.firstName", "user.lastName"])
      .innerJoin("user.userRoles", "userRole")
      .innerJoin("userRole.role", "role", "role.code = :roleCode", {
        roleCode: "AGRONOMO"
      })
      .where("user.public_id = :publicId", { publicId: dto.supervisorId })
      .andWhere("user.is_active = true")
      .getOne();
    if (!supervisor) throw new NotFoundException("Supervisor no disponible.");
    return manager.getRepository(DetallePagoProductorEntity).create({
      paymentId: payment.id,
      creditorId: creditor.id,
      producerDocumentTypeId: documentType.id,
      producerDocumentNumber: creditor.creditorDocumentNumber,
      crateQuantity: dto.cantidadJabas,
      cratePrice: dto.precioJaba,
      kiloPrice: dto.precioKilo,
      weightPercentage: dto.porcentajePeso,
      fairtradeApplies: dto.aplicaFairtrade,
      supervisorId: supervisor.id,
      subtotal: dto.subTotal,
      discountType: dto.tipoDescuento ?? "NO_APLICA",
      discountAmount: dto.montoDescuento ?? "0.00",
      totalAfterDiscount: dto.totalPostDescuento,
      withholdingAmount: dto.detraccion,
      totalAfterWithholding: dto.totalPostDetraccion,
      settlementNumber: dto.nroLiquidacion || null,
      observation: dto.observacion,
      status: "PENDIENTE"
    });
  }

  private async listDetailsForEntity(payment: PagoProductorEntity) {
    const details = await this.dataSource.getRepository(DetallePagoProductorEntity).find({
      where: { paymentId: payment.id },
      relations: { creditor: true, producerDocumentType: true, supervisor: true },
      order: { createdAt: "ASC", id: "ASC" }
    });
    return details.map((detail) => this.toDetailResponseFromRelations(detail));
  }

  private async listDetailsWithinTransaction(
    payment: PagoProductorEntity,
    manager: EntityManager
  ) {
    const details = await manager.getRepository(DetallePagoProductorEntity).find({
      where: { paymentId: payment.id },
      relations: { creditor: true, producerDocumentType: true, supervisor: true },
      order: { createdAt: "ASC", id: "ASC" }
    });
    return details.map((detail) => this.toDetailResponseFromRelations(detail));
  }

  private copyDetailFields(
    target: DetallePagoProductorEntity,
    source: DetallePagoProductorEntity
  ) {
    Object.assign(target, {
      creditorId: source.creditorId,
      producerDocumentTypeId: source.producerDocumentTypeId,
      producerDocumentNumber: source.producerDocumentNumber,
      crateQuantity: source.crateQuantity,
      cratePrice: source.cratePrice,
      kiloPrice: source.kiloPrice,
      weightPercentage: source.weightPercentage,
      fairtradeApplies: source.fairtradeApplies,
      supervisorId: source.supervisorId,
      subtotal: source.subtotal,
      discountType: source.discountType,
      discountAmount: source.discountAmount,
      totalAfterDiscount: source.totalAfterDiscount,
      withholdingAmount: source.withholdingAmount,
      totalAfterWithholding: source.totalAfterWithholding,
      settlementNumber: source.settlementNumber,
      observation: source.observation
    });
  }

  private async toDetailResponse(
    detail: DetallePagoProductorEntity,
    manager = this.dataSource.manager
  ) {
    const full = await manager.getRepository(DetallePagoProductorEntity).findOne({
      where: { id: detail.id },
      relations: { creditor: true, producerDocumentType: true, supervisor: true }
    });
    if (!full) throw new NotFoundException("Detalle de pago no encontrado.");
    return this.toDetailResponseFromRelations(full);
  }

  private toDetailResponseFromRelations(detail: DetallePagoProductorEntity) {
    return {
      id: detail.publicId,
      publicId: detail.publicId,
      acreedorId: detail.creditor?.publicId,
      acreedorNombre: [
        detail.creditor?.creditorFirstName,
        detail.creditor?.creditorLastName
      ]
        .filter(Boolean)
        .join(" "),
      tipoDocumentoProductor: detail.producerDocumentType?.code,
      nroDocumentoProductor: detail.producerDocumentNumber,
      tipoDocumentoAcreedor: detail.creditor?.creditorDocumentType,
      nroDocumentoAcreedor: detail.creditor?.creditorDocumentNumber,
      cantidadJabas: detail.crateQuantity,
      precioJaba: detail.cratePrice,
      precioKilo: detail.kiloPrice,
      porcentajePeso: detail.weightPercentage,
      aplicaFairtrade: detail.fairtradeApplies,
      supervisorId: detail.supervisor?.publicId,
      supervisorNombre: detail.supervisor
        ? `${detail.supervisor.firstName} ${detail.supervisor.lastName}`.trim()
        : "",
      subTotal: detail.subtotal,
      tipoDescuento: detail.discountType,
      montoDescuento: detail.discountAmount,
      totalPostDescuento: detail.totalAfterDiscount,
      detraccion: detail.withholdingAmount,
      totalPostDetraccion: detail.totalAfterWithholding,
      nroLiquidacion: detail.settlementNumber,
      observacion: detail.observation,
      estado: detail.status,
      creadoAt: detail.createdAt,
      actualizadoAt: detail.updatedAt
    };
  }

  private async findPayment(publicId: string, manager = this.dataSource.manager) {
    const payment = await manager
      .getRepository(PagoProductorEntity)
      .findOne({ where: { publicId }, relations: { productor: true } });
    if (!payment) throw new NotFoundException("Pago de productor no encontrado.");
    return payment;
  }

  private async findProducerByPublicId(
    publicId: string,
    manager = this.dataSource.manager
  ) {
    const producer = await manager
      .getRepository(ProductorEntity)
      .findOne({ where: { publicId } });
    if (!producer) throw new NotFoundException("Productor no encontrado.");
    return producer;
  }

  private toPaymentResponse(payment: PagoProductorEntity) {
    return {
      id: payment.publicId,
      publicId: payment.publicId,
      productorId: payment.productor?.publicId,
      productorNombre: payment.productor
        ? [payment.productor.firstName, payment.productor.lastName]
            .filter(Boolean)
            .join(" ") || payment.productor.entityType
        : "",
      sistemaOrigen: payment.sourceSystem,
      nroGuia: payment.guideNumber,
      lote: payment.lot,
      protocolo: payment.protocol,
      variedad: payment.variety,
      tipoCultivo: payment.cropType,
      categoria: payment.category,
      destino: payment.destination,
      fechaCosecha: payment.harvestDate,
      fechaRecepcion: payment.harvestReceptionDate,
      jabas: payment.crateQuantity,
      pesoBruto: payment.grossWeight,
      pesoTara: payment.tareWeight,
      pesoNeto: payment.netWeight,
      pesoPromedio: payment.averageWeight,
      exportador: payment.exporter,
      codigoProductorOrigen: payment.sourceProducerCode,
      nombreProductorOrigen: payment.sourceProducerName,
      estado: payment.status,
      creadoAt: payment.createdAt,
      actualizadoAt: payment.updatedAt
    };
  }

  private assertDates(harvestDate: string, receptionDate: string) {
    if (!isCalendarDate(harvestDate) || !isCalendarDate(receptionDate))
      throw new BadRequestException("Ingresa fechas válidas.");
  }

  private handleUniqueConflict(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } }).driverError
        ?.code === "23505"
    ) {
      throw new ConflictException("Ya existe un registro con esos datos.");
    }
    throw error;
  }

  private batchDetailError(error: unknown, index: number) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message =
        typeof response === "string"
          ? response
          : typeof response === "object" && response !== null && "message" in response
            ? (response as { message: unknown }).message
            : null;
      if (typeof message === "string")
        return new BadRequestException(`Detalle ${index}: ${message}`);
    }
    return new BadRequestException(
      `Detalle ${index}: revisa los datos del acreedor, supervisor e importes.`
    );
  }
}

function isCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
