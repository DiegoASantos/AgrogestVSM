import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { createSuccessResponse } from "../../../common/http/api-response";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ProductoresService } from "../../productores/application/productores.service";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";
import { InvitacionAcreedorProductorEntity } from "../infrastructure/persistence/entities/invitacion-acreedor-productor.entity";
import { RevisionAcreedorCosechaEntity } from "../infrastructure/persistence/entities/revision-acreedor-cosecha.entity";
import type {
  PublicAcreedorCosechaDto,
  ReviewCreditorDto,
  UpdatePublicAcreedorCosechaDto
} from "../presentation/dto/public-acreedor-cosecha.dto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVALID_ACCESS =
  "El código o la sesión no son válidos. Solicita un nuevo acceso al agrónomo.";
type ProducerSession = {
  kind: "comercial-productor";
  invitationId: string;
  productorId: string;
};

@Injectable()
export class ProducerCreditorAccessService {
  constructor(
    @InjectRepository(InvitacionAcreedorProductorEntity)
    private readonly invitations: Repository<InvitacionAcreedorProductorEntity>,
    @InjectRepository(AcreedorCosechaEntity)
    private readonly creditors: Repository<AcreedorCosechaEntity>,
    @InjectRepository(RevisionAcreedorCosechaEntity)
    private readonly reviews: Repository<RevisionAcreedorCosechaEntity>,
    @InjectRepository(ProductorEntity)
    private readonly producerRepository: Repository<ProductorEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly productores: ProductoresService,
    private readonly jwt: JwtService
  ) {}

  async issue(productorId: string, user: AccessTokenPayload) {
    await this.productores.findById(productorId, user);
    const raw = randomBytes(10);
    let bits = 0;
    let buffer = 0;
    let code = "";
    for (const byte of raw) {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        code += CODE_ALPHABET[(buffer >>> bits) & 31];
      }
    }
    const formattedCode = code.match(/.{1,4}/g)!.join("-");
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    await this.invitations.manager.transaction(async (manager) => {
      await manager.findOne(ProductorEntity, {
        where: { id: productorId },
        lock: { mode: "pessimistic_write" }
      });
      await manager.update(
        InvitacionAcreedorProductorEntity,
        { productorId, revokedAt: IsNull() },
        { revokedAt: new Date() }
      );
      await manager.save(InvitacionAcreedorProductorEntity, {
        productorId,
        codeHash: hashCode(code),
        issuedByUserId: user.userId,
        expiresAt
      });
    });
    return createSuccessResponse({ code: formattedCode, expiresAt });
  }

  async exchange(code: string) {
    const normalized = normalizeCode(code);
    if (!/^[A-HJ-NP-Z2-9]{16}$/.test(normalized))
      throw new UnauthorizedException(INVALID_ACCESS);
    const invitation = await this.invitations.findOne({
      where: { codeHash: hashCode(normalized) }
    });
    if (!invitation || !isActive(invitation))
      throw new UnauthorizedException(INVALID_ACCESS);
    const producer = await this.producerRepository.findOne({
      where: { id: invitation.productorId }
    });
    if (!producer) throw new UnauthorizedException(INVALID_ACCESS);
    const session = await this.jwt.signAsync(
      {
        kind: "comercial-productor",
        invitationId: invitation.id,
        productorId: invitation.productorId
      } satisfies ProducerSession,
      { expiresIn: "30m" }
    );
    return createSuccessResponse({
      session,
      expiresInSeconds: 1800,
      producerName: [producer.firstName, producer.lastName].filter(Boolean).join(" ")
    });
  }

  async context(authorization: string | undefined): Promise<ProducerSession> {
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
    if (!token) throw new UnauthorizedException(INVALID_ACCESS);
    let payload: ProducerSession;
    try {
      payload = await this.jwt.verifyAsync<ProducerSession>(token);
    } catch {
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    if (
      payload.kind !== "comercial-productor" ||
      !payload.invitationId ||
      !payload.productorId
    ) {
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    const invitation = await this.invitations.findOne({
      where: { id: payload.invitationId }
    });
    if (
      !invitation ||
      invitation.productorId !== payload.productorId ||
      !isActive(invitation)
    ) {
      throw new UnauthorizedException(INVALID_ACCESS);
    }
    return payload;
  }

  async ownCreditors(authorization: string | undefined) {
    const { productorId } = await this.context(authorization);
    return createSuccessResponse(
      (
        await this.creditors.find({
          where: { productorId },
          order: { createdAt: "ASC", id: "ASC" }
        })
      ).map(toPublicCreditor)
    );
  }

  async ownHistory(authorization: string | undefined, id: string) {
    const { productorId } = await this.context(authorization);
    assertPositiveId(id);
    const creditor = await this.creditors.findOne({ where: { id, productorId } });
    if (!creditor) throw new NotFoundException("Perfil no encontrado.");
    const history = await this.reviews.find({
      where: { creditorId: id },
      order: { createdAt: "DESC", id: "DESC" }
    });
    return createSuccessResponse(
      history.map(({ decision, observation, createdAt }) => ({
        decision,
        observation,
        createdAt
      }))
    );
  }

  async createCreditor(authorization: string | undefined, dto: PublicAcreedorCosechaDto) {
    const { productorId } = await this.context(authorization);
    const data = this.validatedCreditor(productorId, dto);
    if (dto.publicId) {
      const replay = await this.creditors.findOne({ where: { publicId: dto.publicId } });
      if (replay) {
        if (replay.productorId !== productorId)
          throw new ConflictException("No se pudo guardar el perfil.");
        return createSuccessResponse(toPublicCreditor(replay));
      }
    }
    const existing = await this.creditors.findOne({ where: this.naturalKey(data) });
    if (existing) return createSuccessResponse(toPublicCreditor(existing));
    try {
      const creditor = this.creditors.create({
        ...data,
        publicId: dto.publicId,
        source: "PRODUCTOR",
        approvalStatus: "PENDING",
        createdByUserId: null
      });
      return createSuccessResponse(toPublicCreditor(await this.creditors.save(creditor)));
    } catch {
      throw new ConflictException("No se pudo guardar el perfil. Revisa si ya existe.");
    }
  }

  async updateCreditor(
    authorization: string | undefined,
    id: string,
    dto: UpdatePublicAcreedorCosechaDto
  ) {
    const { productorId } = await this.context(authorization);
    assertPositiveId(id);
    const creditor = await this.creditors.findOne({ where: { id, productorId } });
    if (!creditor) throw new NotFoundException("Perfil no encontrado.");
    const data = this.validatedCreditor(productorId, dto);
    Object.assign(creditor, data, {
      approvalStatus: "PENDING",
      reviewObservation: null,
      reviewedAt: null,
      reviewedByUserId: null,
      updatedAt: new Date()
    });
    try {
      return createSuccessResponse(toPublicCreditor(await this.creditors.save(creditor)));
    } catch {
      throw new ConflictException(
        "No se pudo actualizar el perfil. Revisa si ya existe."
      );
    }
  }

  async reviewList(status?: string, page = 1) {
    if (status && !["PENDING", "APPROVED", "OBSERVED"].includes(status))
      throw new BadRequestException("Estado inválido.");
    if (!Number.isSafeInteger(page) || page < 1)
      throw new BadRequestException("Página inválida.");
    const [items, total] = await this.creditors.findAndCount({
      where: status
        ? { approvalStatus: status as AcreedorCosechaEntity["approvalStatus"] }
        : {},
      order: { createdAt: "DESC", id: "DESC" },
      take: 25,
      skip: (page - 1) * 25
    });
    const producerIds = [...new Set(items.map((item) => item.productorId))];
    const actorIds = [
      ...new Set(
        items.map((item) => item.createdByUserId).filter((id): id is string => !!id)
      )
    ];
    const producers = producerIds.length
      ? await this.producerRepository.find({ where: { id: In(producerIds) } })
      : [];
    const actors = actorIds.length
      ? await this.userRepository.find({ where: { id: In(actorIds) } })
      : [];
    return createSuccessResponse({
      items: items.map((item) => ({
        ...item,
        producerName: producers.find((producer) => producer.id === item.productorId)
          ? [
              producers.find((producer) => producer.id === item.productorId)!.firstName,
              producers.find((producer) => producer.id === item.productorId)!.lastName
            ]
              .filter(Boolean)
              .join(" ")
          : "Productor",
        capturedBy:
          item.source === "PRODUCTOR"
            ? "Productor"
            : [
                actors.find((actor) => actor.id === item.createdByUserId)?.firstName,
                actors.find((actor) => actor.id === item.createdByUserId)?.lastName
              ]
                .filter(Boolean)
                .join(" ")
      })),
      total,
      page,
      pageSize: 25
    });
  }

  async history(id: string) {
    assertPositiveId(id);
    const creditor = await this.creditors.findOne({ where: { id } });
    if (!creditor) throw new NotFoundException("Perfil no encontrado.");
    return createSuccessResponse(
      await this.reviews.find({
        where: { creditorId: id },
        order: { createdAt: "DESC", id: "DESC" }
      })
    );
  }

  async review(id: string, dto: ReviewCreditorDto, user: AccessTokenPayload) {
    assertPositiveId(id);
    const observation = dto.observation?.trim() || null;
    if (dto.decision === "OBSERVED" && !observation)
      throw new BadRequestException("Escribe una observación antes de enviar.");
    const result = await this.creditors.manager.transaction(async (manager) => {
      const creditor = await manager.findOne(AcreedorCosechaEntity, {
        where: { id },
        lock: { mode: "pessimistic_write" }
      });
      if (!creditor) throw new NotFoundException("Perfil no encontrado.");
      if (
        creditor.approvalStatus !== "PENDING" &&
        !(creditor.approvalStatus === "APPROVED" && dto.decision === "OBSERVED")
      ) {
        throw new ConflictException("El perfil ya fue revisado. Actualiza la lista.");
      }
      creditor.approvalStatus = dto.decision;
      creditor.reviewObservation = observation;
      creditor.reviewedByUserId = user.userId;
      creditor.reviewedAt = new Date();
      creditor.updatedAt = new Date();
      const saved = await manager.save(creditor);
      await manager.save(RevisionAcreedorCosechaEntity, {
        creditorId: id,
        reviewerUserId: user.userId,
        decision: dto.decision,
        observation
      });
      return saved;
    });
    return createSuccessResponse(result);
  }

  private validatedCreditor(productorId: string, dto: UpdatePublicAcreedorCosechaDto) {
    const length = dto.creditorDocumentType === "DNI" ? 8 : 11;
    if (dto.creditorDocumentNumber?.length !== length) {
      throw new BadRequestException("Revisa nombres, documento, banco y cuenta o CCI.");
    }
    return {
      productorId,
      creditorFirstName: dto.creditorFirstName,
      creditorLastName: dto.creditorLastName,
      creditorDocumentType: dto.creditorDocumentType,
      creditorDocumentNumber: dto.creditorDocumentNumber,
      bank: dto.bank,
      accountNumber: dto.accountNumber
    };
  }

  private naturalKey(
    data: ReturnType<ProducerCreditorAccessService["validatedCreditor"]>
  ) {
    return {
      productorId: data.productorId,
      creditorDocumentType: data.creditorDocumentType,
      creditorDocumentNumber: data.creditorDocumentNumber,
      bank: data.bank,
      accountNumber: data.accountNumber
    };
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/-/g, "");
}
function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
function isActive(invitation: InvitacionAcreedorProductorEntity) {
  return !invitation.revokedAt && invitation.expiresAt.getTime() > Date.now();
}

function assertPositiveId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new BadRequestException("Identificador inválido.");
}

function toPublicCreditor(creditor: AcreedorCosechaEntity) {
  return {
    id: creditor.id,
    publicId: creditor.publicId,
    creditorFirstName: creditor.creditorFirstName,
    creditorLastName: creditor.creditorLastName,
    creditorDocumentType: creditor.creditorDocumentType,
    creditorDocumentNumber: creditor.creditorDocumentNumber,
    bank: creditor.bank,
    accountNumber: creditor.accountNumber,
    approvalStatus: creditor.approvalStatus,
    source: creditor.source,
    reviewObservation: creditor.reviewObservation,
    createdAt: creditor.createdAt,
    updatedAt: creditor.updatedAt
  };
}
