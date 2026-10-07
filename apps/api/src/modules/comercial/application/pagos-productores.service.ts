import {
  BadRequestException,
  ConflictException,
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
      this.dataSource.getRepository(UserEntity).find({
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          isActive: true
        },
        where: { isActive: true },
        order: { lastName: "ASC", firstName: "ASC" }
      }),
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
    const repository = this.dataSource.getRepository(PagoProductorEntity);
    const producer = await this.findProducerByPublicId(dto.productorId);
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
    try {
      const saved = await repository.save(payment);
      return createSuccessResponse(
        this.toPaymentResponse(await this.findPayment(saved.publicId))
      );
    } catch (error) {
      this.handleUniqueConflict(error);
    }
  }

  async update(id: string, dto: UpdatePagoProductorDto) {
    return this.dataSource.transaction(async (manager) => {
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
      return createSuccessResponse(
        this.toPaymentResponse(await this.findPayment(saved.publicId, manager))
      );
    });
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
    const creditors = await this.dataSource.getRepository(AcreedorCosechaEntity).find({
      where: { productorId: payment.productorId, approvalStatus: "APPROVED" },
      order: { creditorLastName: "ASC", creditorFirstName: "ASC" }
    });
    return createSuccessResponse(
      creditors.map((creditor) => ({
        id: creditor.publicId,
        nombre: `${creditor.creditorFirstName} ${creditor.creditorLastName}`.trim()
      }))
    );
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
      .findOne({ where: { code: dto.tipoDocumentoProductor } });
    if (!documentType)
      throw new BadRequestException("Tipo de documento del productor no válido.");
    const expectedDocumentLength =
      dto.tipoDocumentoProductor === "DNI"
        ? 8
        : dto.tipoDocumentoProductor === "RUC"
          ? 11
          : null;
    if (
      expectedDocumentLength &&
      dto.nroDocumentoProductor.length !== expectedDocumentLength
    )
      throw new BadRequestException(
        `El ${dto.tipoDocumentoProductor} debe tener ${expectedDocumentLength} dígitos.`
      );
    const supervisor = await manager
      .getRepository(UserEntity)
      .findOne({ where: { publicId: dto.supervisorId, isActive: true } });
    if (!supervisor) throw new NotFoundException("Supervisor no disponible.");
    return manager.getRepository(DetallePagoProductorEntity).create({
      paymentId: payment.id,
      creditorId: creditor.id,
      producerDocumentTypeId: documentType.id,
      producerDocumentNumber: dto.nroDocumentoProductor,
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
