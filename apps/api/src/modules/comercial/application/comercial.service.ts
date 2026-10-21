import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createSuccessResponse } from "../../../common/http/api-response";
import { ProductoresService } from "../../productores/application/productores.service";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import { PagoCosechaEntity } from "../infrastructure/persistence/entities/pago-cosecha.entity";
import { RegistroCosechaEntity } from "../infrastructure/persistence/entities/registro-cosecha.entity";
import { CreateAcreedorCosechaDto } from "../presentation/dto/create-acreedor-cosecha.dto";
import { CreatePagoCosechaDto } from "../presentation/dto/create-pago-cosecha.dto";
import { CreateRegistroCosechaDto } from "../presentation/dto/create-registro-cosecha.dto";

type CreditorFields = Pick<
  AcreedorCosechaEntity,
  | "productorId"
  | "creditorFirstName"
  | "creditorLastName"
  | "creditorDocumentType"
  | "creditorDocumentNumber"
> & { bank: NonNullable<AcreedorCosechaEntity["bank"]>; accountNumber: string };
@Injectable()
export class ComercialService {
  constructor(
    @InjectRepository(PagoCosechaEntity)
    private readonly pagos: Repository<PagoCosechaEntity>,
    @InjectRepository(AcreedorCosechaEntity)
    private readonly acreedores: Repository<AcreedorCosechaEntity>,
    @InjectRepository(RegistroCosechaEntity)
    private readonly registros: Repository<RegistroCosechaEntity>,
    private readonly productores: ProductoresService
  ) {}

  async create(dto: CreatePagoCosechaDto, user: AccessTokenPayload) {
    const expected = dto.creditorDocumentType === "DNI" ? 8 : 11;
    if (dto.creditorDocumentNumber.length !== expected) {
      throw new BadRequestException(
        `El ${dto.creditorDocumentType} debe tener ${expected} digitos.`
      );
    }

    const existing = dto.publicId
      ? await this.pagos.findOne({ where: { publicId: dto.publicId } })
      : null;

    if (existing) {
      await this.productores.findById(existing.productorId, user);
      await this.ensureCreditor(existing, existing.createdByUserId);
      return createSuccessResponse(existing);
    }

    const canonical = await this.productores.findById(dto.productorId, user);
    const payment = this.pagos.create({ ...dto, productorId: canonical.data.id, createdByUserId: user.userId });
    const saved = await this.pagos.save(payment);
    await this.ensureCreditor(saved, user.userId);
    return createSuccessResponse(saved);
  }

  async createCreditor(dto: CreateAcreedorCosechaDto, user: AccessTokenPayload) {
    this.assertDocumentLength(dto);

    const idempotent = dto.publicId
      ? await this.acreedores.findOne({ where: { publicId: dto.publicId } })
      : null;

    const canonical = await this.productores.findById(dto.productorId, user);
    if (idempotent) {
      const resolved = idempotent.mergedIntoId
        ? await this.acreedores.findOne({ where: { id: idempotent.mergedIntoId } })
        : idempotent;
      if (!resolved || resolved.productorId !== canonical.data.id) throw new ConflictException("El perfil ya existe en otro productor.");
      return createSuccessResponse(resolved);
    }

    dto.productorId = canonical.data.id;
    const existing = await this.acreedores.findOne({
      where: {
        productorId: dto.productorId,
        creditorDocumentType: dto.creditorDocumentType,
        creditorDocumentNumber: dto.creditorDocumentNumber,
        bank: dto.bank,
        accountNumber: dto.accountNumber
      }
    });

    if (existing) {
      return createSuccessResponse(existing);
    }

    return createSuccessResponse(await this.ensureCreditor(dto, user.userId));
  }

  async createCreditorIdentity(
    dto: Pick<CreateAcreedorCosechaDto, "productorId" | "publicId" | "creditorFirstName" | "creditorLastName" | "creditorDocumentType" | "creditorDocumentNumber">,
    user: AccessTokenPayload
  ) {
    this.assertDocumentLength(dto);
    const canonical = await this.productores.findById(dto.productorId, user);
    const existingId = dto.publicId
      ? await this.acreedores.findOne({ where: { publicId: dto.publicId } })
      : null;
    if (existingId) {
      if (existingId.productorId !== canonical.data.id) throw new ConflictException("El perfil pertenece a otro productor.");
      if (existingId.creditorFirstName !== dto.creditorFirstName ||
        existingId.creditorLastName !== dto.creditorLastName ||
        existingId.creditorDocumentType !== dto.creditorDocumentType ||
        existingId.creditorDocumentNumber !== dto.creditorDocumentNumber) {
        throw new ConflictException("El identificador del acreedor pertenece a otra identidad.");
      }
      return createSuccessResponse(existingId);
    }
    const identity = await this.acreedores.findOne({ where: {
      productorId: canonical.data.id,
      creditorDocumentType: dto.creditorDocumentType,
      creditorDocumentNumber: dto.creditorDocumentNumber,
      approvalStatus: "INCOMPLETE"
    } });
    if (identity) {
      if (identity.creditorFirstName !== dto.creditorFirstName ||
        identity.creditorLastName !== dto.creditorLastName) {
        throw new ConflictException("El documento pertenece a otra identidad de acreedor.");
      }
      return createSuccessResponse(identity);
    }
    return createSuccessResponse(await this.acreedores.save(this.acreedores.create({
      ...dto,
      productorId: canonical.data.id,
      bank: null,
      accountNumber: null,
      approvalStatus: "INCOMPLETE",
      source: "MOBILE",
      createdByUserId: user.userId
    })));
  }

  async completeCreditor(id: string, bank: AcreedorCosechaEntity["bank"], accountNumber: string, user: AccessTokenPayload) {
    if (!/^[1-9]\d*$/.test(id)) throw new BadRequestException("Identificador de acreedor invÃ¡lido.");
    const creditor = await this.acreedores.findOne({ where: { id } });
    if (!creditor) throw new NotFoundException("Acreedor no encontrado.");
    await this.productores.findById(creditor.productorId, user);
    if (!bank || !/^\d{1,30}$/.test(accountNumber)) throw new BadRequestException("Completa banco y cuenta válidos.");
    if (creditor.approvalStatus !== "INCOMPLETE") {
      if (creditor.bank === bank && creditor.accountNumber === accountNumber) return createSuccessResponse(creditor);
      throw new ConflictException("El acreedor ya tiene cuenta registrada.");
    }
    creditor.bank = bank;
    creditor.accountNumber = accountNumber;
    creditor.approvalStatus = "PENDING";
    creditor.updatedAt = new Date();
    return createSuccessResponse(await this.acreedores.save(creditor));
  }

  async findCreditors(productorId: string, user: AccessTokenPayload) {
    const canonical = await this.productores.findById(productorId, user);
    return createSuccessResponse(
      await this.acreedores.find({
        where: { productorId: canonical.data.id },
        order: { createdAt: "ASC", id: "ASC" }
      })
    );
  }

  async createHarvestRecord(dto: CreateRegistroCosechaDto, user: AccessTokenPayload) {
    this.assertHarvestRecord(dto);

    const idempotent = dto.publicId
      ? await this.registros.findOne({ where: { publicId: dto.publicId } })
      : null;

    if (idempotent) {
      await this.productores.findById(idempotent.productorId, user);
      return createSuccessResponse(idempotent);
    }

    const canonical = await this.productores.findById(dto.productorId, user);
    dto.productorId = canonical.data.id;
    let creditor = await this.acreedores.findOne({ where: { id: dto.creditorId } });
    if (creditor?.mergedIntoId) {
      creditor = await this.acreedores.findOne({ where: { id: creditor.mergedIntoId } });
    }

    if (!creditor || creditor.productorId !== dto.productorId) {
      throw new NotFoundException("Acreedor no disponible para el productor seleccionado.");
    }
    if (creditor.approvalStatus !== "APPROVED") {
      throw new ConflictException("El acreedor debe estar aprobado para registrar la cosecha.");
    }

    const record = this.registros.create({
      publicId: dto.publicId,
      productorId: dto.productorId,
      creditorId: creditor.id,
      crateQuantity: Number(dto.crateQuantity),
      cratePrice: normalizePrice(dto.cratePrice),
      registrationDate: dto.registrationDate,
      harvestDate: dto.harvestDate,
      creditorFirstName: creditor.creditorFirstName,
      creditorLastName: creditor.creditorLastName,
      creditorDocumentType: creditor.creditorDocumentType,
      creditorDocumentNumber: creditor.creditorDocumentNumber,
      bank: creditor.bank!,
      accountNumber: creditor.accountNumber!,
      createdByUserId: user.userId
    });

    return createSuccessResponse(await this.registros.save(record));
  }

  private async ensureCreditor(
    source: CreditorFields,
    createdByUserId: string
  ): Promise<AcreedorCosechaEntity> {
    const existing = await this.acreedores.findOne({
      where: {
        productorId: source.productorId,
        creditorDocumentType: source.creditorDocumentType,
        creditorDocumentNumber: source.creditorDocumentNumber,
        bank: source.bank,
        accountNumber: source.accountNumber
      }
    });

    if (existing) return existing;

    try {
      return await this.acreedores.save(
        this.acreedores.create({
          ...source,
          createdByUserId,
          approvalStatus: "PENDING",
          source: "MOBILE"
        })
      );
    } catch (error) {
      const canonical = await this.acreedores.findOne({
        where: {
          productorId: source.productorId,
          creditorDocumentType: source.creditorDocumentType,
          creditorDocumentNumber: source.creditorDocumentNumber,
          bank: source.bank,
          accountNumber: source.accountNumber
        }
      });
      if (canonical) return canonical;
      throw error;
    }
  }

  private assertDocumentLength(dto: Pick<CreditorFields, "creditorDocumentType" | "creditorDocumentNumber">) {
    const expected = dto.creditorDocumentType === "DNI" ? 8 : 11;
    if (dto.creditorDocumentNumber.length !== expected) {
      throw new BadRequestException(
        `El ${dto.creditorDocumentType} debe tener ${expected} digitos.`
      );
    }
  }

  private assertHarvestRecord(dto: CreateRegistroCosechaDto) {
    const price = Number(dto.cratePrice);
    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException("El precio de jaba debe ser mayor que cero.");
    }

    if (!isCalendarDate(dto.registrationDate) || !isCalendarDate(dto.harvestDate)) {
      throw new BadRequestException("Ingresa fechas validas.");
    }

    if (dto.harvestDate > dto.registrationDate) {
      throw new BadRequestException("La fecha de cosecha no puede ser posterior a la fecha actual.");
    }
  }
}

function normalizePrice(value: string) {
  return Number(value).toFixed(2);
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
