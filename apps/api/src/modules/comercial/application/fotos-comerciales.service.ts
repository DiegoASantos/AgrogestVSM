import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { DataSource, Repository } from "typeorm";
import { createPaginatedMeta, createSuccessResponse } from "../../../common/http/api-response";
import { AppConfigService } from "../../../config/app-config.service";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ProductoresService } from "../../productores/application/productores.service";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { FotoComercialProductorEntity } from "../infrastructure/persistence/entities/foto-comercial-productor.entity";
import { VisitaComercialEntity } from "../../visitas-comerciales/infrastructure/persistence/entities/visita-comercial.entity";
import { AcreedorCosechaEntity } from "../infrastructure/persistence/entities/acreedor-cosecha.entity";

const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class FotosComercialesService {
  constructor(
    @InjectRepository(FotoComercialProductorEntity)
    private readonly photos: Repository<FotoComercialProductorEntity>,
    @InjectRepository(ProductorEntity)
    private readonly producers: Repository<ProductorEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authorizedProducers: ProductoresService,
    private readonly config: AppConfigService
  ) {}

  async assertProducerAccess(producerId: string, user: AccessTokenPayload) {
    if (!/^[1-9]\d*$/.test(producerId)) throw new BadRequestException("Identificador de productor inválido.");
    const canonical = await this.authorizedProducers.findById(producerId, user);
    const producer = await this.producers.findOne({ where: { id: canonical.data.id } });
    if (!producer) throw new NotFoundException("Productor no encontrado.");
    return producer;
  }

  async assertVisitAccess(visitId: string, user: AccessTokenPayload, write = false) {
    if (!/^[1-9]\d*$/.test(visitId)) throw new BadRequestException("Identificador de visita inválido.");
    const visit = await this.dataSource.getRepository(VisitaComercialEntity).findOne({
      where: { id: visitId, activo: true }
    });
    if (!visit || (write && visit.agronomoUsuarioId !== user.userId) ||
      (!write && !user.roles.includes("ADMIN") && !user.roles.includes("ANALISTA") && visit.agronomoUsuarioId !== user.userId)) {
      throw new NotFoundException("Visita comercial no encontrada.");
    }
    if (!visit.productorId) throw new BadRequestException("La visita no tiene productor vinculado.");
    return visit;
  }

  async assertCreditorAccess(creditorId: string, user: AccessTokenPayload) {
    if (!/^[1-9]\d*$/.test(creditorId)) throw new BadRequestException("Identificador de acreedor inválido.");
    const creditor = await this.dataSource.getRepository(AcreedorCosechaEntity).findOne({ where: { id: creditorId } });
    if (!creditor || creditor.mergedIntoId) throw new NotFoundException("Acreedor no encontrado.");
    const producer = await this.assertProducerAccess(creditor.productorId, user);
    return { creditor, producer };
  }

  async upload(producer: ProductorEntity, publicId: string, input: Buffer, userId: string, visitId: string | null = null, creditorId: string | null = null) {
    if (!UUID.test(publicId)) throw new BadRequestException("Identificador de foto inválido.");
    if (input.length === 0 || input.length > MAX_BYTES) {
      throw new BadRequestException("La foto supera el tamaño permitido.");
    }
    const originalSha256 = sha256(input);
    const existing = await this.photos.findOne({ where: { publicId } });
    if (existing) return createSuccessResponse(await this.assertIdempotent(existing, producer.id, originalSha256, visitId, creditorId));

    let normalized: Buffer;
    try {
      const metadata = await sharp(input, { limitInputPixels: 36_000_000, failOn: "error" }).metadata();
      if (metadata.format !== "jpeg" || !metadata.width || !metadata.height) {
        throw new Error("invalid image");
      }
      normalized = await sharp(input, { limitInputPixels: 36_000_000, failOn: "error" })
        .rotate()
        .resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch {
      throw new BadRequestException("La imagen no es un JPEG válido.");
    }

    const { directory, key } = this.storage();
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    const encrypted = Buffer.concat([cipher.update(normalized), cipher.final()]);
    const tag = cipher.getAuthTag();
    const storageKey = randomUUID();
    const destination = join(directory, storageKey + ".enc");
    const temporary = join(directory, storageKey + ".tmp");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    try {
      const handle = await open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(encrypted);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, destination);
      const saved = await this.photos.save(this.photos.create({
        publicId,
        productorId: producer.id,
        visitaComercialId: visitId,
        acreedorId: creditorId,
        createdByUserId: userId,
        storageKey,
        originalSha256,
        storedSha256: sha256(encrypted),
        sizeBytes: normalized.length,
        mimeType: "image/jpeg",
        nonceHex: nonce.toString("hex"),
        authTagHex: tag.toString("hex"),
        keyVersion: 1
      }));
      return createSuccessResponse(this.toResponse(saved));
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      await unlink(destination).catch(() => undefined);
      const canonical = await this.photos.findOne({ where: { publicId } });
      if (canonical) return createSuccessResponse(await this.assertIdempotent(canonical, producer.id, originalSha256, visitId, creditorId));
      throw error;
    }
  }

  async listProducers(page: number, limit: number, search: string) {
    const term = search.trim().slice(0, 100);
    const condition = term ? "WHERE CONCAT_WS(' ', p.nombres, p.apellidos) ILIKE $1" : "";
    const parameters = term ? ["%" + term + "%"] : [];
    const rows = await this.dataSource.query(
      `SELECT p.id AS "productorId",
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', p.nombres, p.apellidos)), ''), p.entidad) AS "productorNombre",
         COUNT(f.id)::integer AS "cantidadFotos", MAX(f.creado_at) AS "ultimaFotoAt"
       FROM fotos_comerciales_productor f
       JOIN productores p ON p.id = f.productor_id
       ${condition}
       GROUP BY p.id
       ORDER BY MAX(f.creado_at) DESC, p.id DESC
       LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`,
      [...parameters, limit, (page - 1) * limit]
    ) as Array<{ productorId: string; productorNombre: string; cantidadFotos: number; ultimaFotoAt: Date }>;
    const count = await this.dataSource.query(
      `SELECT COUNT(DISTINCT p.id)::integer AS total
       FROM fotos_comerciales_productor f
       JOIN productores p ON p.id = f.productor_id ${condition}`,
      parameters
    ) as Array<{ total: number }>;
    return createSuccessResponse(rows, createPaginatedMeta(count[0]?.total ?? 0, page, limit));
  }

  async listForProducer(producerId: string, page: number, limit: number) {
    if (!/^[1-9]\d*$/.test(producerId)) throw new BadRequestException("Identificador de productor inválido.");
    const producer = await this.producers.findOne({ where: { id: producerId } });
    if (!producer) throw new NotFoundException("Productor no encontrado.");
    const [photos, total] = await this.photos.findAndCount({
      where: { productorId: producer.id },
      order: { createdAt: "DESC", id: "DESC" },
      take: limit,
      skip: (page - 1) * limit
    });
    return createSuccessResponse(
      photos.map((photo) => this.toResponse(photo)),
      createPaginatedMeta(total, page, limit)
    );
  }

  async listForVisit(visitId: string, page: number, limit: number, user: AccessTokenPayload) {
    await this.assertVisitAccess(visitId, user);
    const [photos, total] = await this.photos.findAndCount({
      where: { visitaComercialId: visitId },
      order: { createdAt: "DESC", id: "DESC" },
      take: limit,
      skip: (page - 1) * limit
    });
    return createSuccessResponse(photos.map((photo) => this.toResponse(photo)),
      createPaginatedMeta(total, page, limit));
  }

  async readForVisit(visitId: string, publicId: string, user: AccessTokenPayload) {
    await this.assertVisitAccess(visitId, user);
    const photo = await this.photos.findOne({ where: { publicId, visitaComercialId: visitId } });
    if (!photo) throw new NotFoundException("Foto no encontrada.");
    return this.read(publicId, user.userId);
  }

  async listForCreditor(creditorId: string, page: number, limit: number, user: AccessTokenPayload) {
    await this.assertCreditorAccess(creditorId, user);
    const [photos, total] = await this.photos.findAndCount({
      where: { acreedorId: creditorId },
      order: { createdAt: "DESC", id: "DESC" },
      take: limit,
      skip: (page - 1) * limit
    });
    return createSuccessResponse(photos.map((photo) => this.toResponse(photo)),
      createPaginatedMeta(total, page, limit));
  }

  async readForCreditor(creditorId: string, publicId: string, user: AccessTokenPayload) {
    await this.assertCreditorAccess(creditorId, user);
    const photo = await this.photos.findOne({ where: { publicId, acreedorId: creditorId } });
    if (!photo) throw new NotFoundException("Foto no encontrada.");
    return this.read(publicId, user.userId);
  }

  async read(publicId: string, userId: string): Promise<Buffer> {
    const photo = await this.photos.findOne({ where: { publicId } });
    if (!photo) throw new NotFoundException("Foto no encontrada.");
    const { directory, key } = this.storage();
    let encrypted: Buffer;
    try {
      encrypted = await readFile(join(directory, photo.storageKey + ".enc"));
    } catch {
      throw new ServiceUnavailableException("La foto no está disponible en el almacenamiento.");
    }
    if (sha256(encrypted) !== photo.storedSha256.trim()) {
      throw new ServiceUnavailableException("La foto no supera la comprobación de integridad.");
    }
    let content: Buffer;
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(photo.nonceHex, "hex"));
      decipher.setAuthTag(Buffer.from(photo.authTagHex, "hex"));
      content = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch {
      throw new ServiceUnavailableException("No se pudo descifrar la foto.");
    }
    await this.dataSource.query(
      "INSERT INTO fotos_comerciales_accesos (foto_id, usuario_id, accion) VALUES ($1, $2, 'VER')",
      [photo.id, userId]
    );
    return content;
  }

  private storage() {
    const { directory, keyHex } = this.config.commercialPhotos;
    if (!directory || !keyHex) throw new ServiceUnavailableException("Almacenamiento de fotos no configurado.");
    return { directory: resolve(directory), key: Buffer.from(keyHex, "hex") };
  }

  private async assertIdempotent(photo: FotoComercialProductorEntity, producerId: string, hash: string, visitId: string | null, creditorId: string | null) {
    if (photo.productorId !== producerId || (photo.visitaComercialId ?? null) !== visitId || (photo.acreedorId ?? null) !== creditorId || photo.originalSha256.trim() !== hash) {
      throw new ConflictException("El identificador de foto ya pertenece a otro contenido.");
    }
    const { directory } = this.storage();
    let encrypted: Buffer;
    try {
      encrypted = await readFile(join(directory, photo.storageKey + ".enc"));
    } catch {
      throw new ServiceUnavailableException("La foto no está disponible en el almacenamiento.");
    }
    if (sha256(encrypted) !== photo.storedSha256.trim()) {
      throw new ServiceUnavailableException("La foto no supera la comprobación de integridad.");
    }
    return this.toResponse(photo);
  }

  private toResponse(photo: FotoComercialProductorEntity) {
    return { id: photo.publicId, publicId: photo.publicId, createdAt: photo.createdAt };
  }
}

function sha256(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
