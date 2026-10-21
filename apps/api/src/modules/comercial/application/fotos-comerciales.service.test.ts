import { ConflictException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { DataSource, Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfigService } from "../../../config/app-config.service";
import type { ProductoresService } from "../../productores/application/productores.service";
import type { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import type { FotoComercialProductorEntity } from "../infrastructure/persistence/entities/foto-comercial-productor.entity";
import { FotosComercialesService } from "./fotos-comerciales.service";

const photoId = "00ff44f0-71e3-4db2-b73e-98dca77ef91e";
const producer = { id: "42", publicId: "ac3d382d-cd84-4b02-b5fe-9c9de882be1c" } as ProductorEntity;

describe("FotosComercialesService", () => {
  let directory: string;
  let saved: FotoComercialProductorEntity | null;
  let service: FotosComercialesService;
  let input: Buffer;
  let query: ReturnType<typeof vi.fn>;
  let authorize: ReturnType<typeof vi.fn>;
  let findProducer: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "agrogest-photo-test-"));
    saved = null;
    input = await sharp({ create: { width: 40, height: 20, channels: 3, background: "white" } })
      .jpeg().toBuffer();
    const photos = {
      findOne: vi.fn(async () => saved),
      create: vi.fn((value: FotoComercialProductorEntity) => value),
      save: vi.fn(async (value: FotoComercialProductorEntity) => {
        saved = { ...value, id: "7", createdAt: new Date("2026-10-13T00:00:00Z") };
        return saved;
      })
    } as unknown as Repository<FotoComercialProductorEntity>;
    query = vi.fn().mockResolvedValue([]);
    authorize = vi.fn().mockResolvedValue({ data: { id: "42" } });
    findProducer = vi.fn(async () => producer);
    service = new FotosComercialesService(
      photos,
      { findOne: findProducer } as unknown as Repository<ProductorEntity>,
      { query } as unknown as DataSource,
      { findById: authorize } as unknown as ProductoresService,
      { commercialPhotos: { directory, keyHex: "a".repeat(64) } } as AppConfigService
    );
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("stores encrypted JPEG without metadata and reads it with an audit event", async () => {
    input = await sharp(input).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const uploaded = await service.upload(producer, photoId, input, "8");
    expect(uploaded.data).toMatchObject({ publicId: photoId });
    expect(saved).not.toBeNull();
    const encrypted = await readFile(join(directory, saved!.storageKey + ".enc"));
    expect(encrypted.equals(input)).toBe(false);
    const content = await service.read(photoId, "9");
    const metadata = await sharp(content).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.exif).toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("fotos_comerciales_accesos"), ["7", "9"]);
  });

  it("returns the same record on retry, rejects changed bytes, and detects missing storage", async () => {
    await service.upload(producer, photoId, input, "8");
    expect((await service.upload(producer, photoId, input, "8")).data).toMatchObject({ publicId: photoId });
    const changed = await sharp({ create: { width: 40, height: 20, channels: 3, background: "black" } })
      .jpeg().toBuffer();
    await expect(service.upload(producer, photoId, changed, "8")).rejects.toBeInstanceOf(ConflictException);
    await rm(join(directory, saved!.storageKey + ".enc"));
    await expect(service.upload(producer, photoId, input, "8")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("keeps a photo bound to its visit or creditor on idempotent retries", async () => {
    await service.upload(producer, photoId, input, "8", "11");
    expect(saved).toMatchObject({ visitaComercialId: "11", acreedorId: null });
    expect((await service.upload(producer, photoId, input, "8", "11")).data.publicId).toBe(photoId);
    await expect(service.upload(producer, photoId, input, "8", null, "12"))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects a tampered encrypted file before serving it", async () => {
    await service.upload(producer, photoId, input, "8");
    await writeFile(join(directory, saved!.storageKey + ".enc"), "tampered");
    await expect(service.read(photoId, "9")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
  });

  it("requires the agronomist's producer access before upload", async () => {
    const user = { sub: "8", userId: "8", email: "test@example.invalid", roles: ["AGRONOMO"] };
    authorize.mockRejectedValueOnce(new NotFoundException());
    await expect(service.assertProducerAccess("42", user))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(authorize).toHaveBeenCalledWith("42", user);
  });

  it("resolves a pending photo upload through an old producer ID", async () => {
    const user = { sub: "8", userId: "8", email: "test@example.invalid", roles: ["AGRONOMO"] };
    const resolved = await service.assertProducerAccess("22", user);
    expect(resolved.id).toBe("42");
    expect(findProducer).toHaveBeenCalledWith({ where: { id: "42" } });
  });

  it("lists producers with photos even when they have no creditor", async () => {
    query.mockResolvedValueOnce([{
      productorId: "42", productorNombre: "Ana López", cantidadFotos: 1,
      ultimaFotoAt: new Date("2026-10-13T00:00:00Z")
    }]).mockResolvedValueOnce([{ total: 1 }]);

    const response = await service.listProducers(1, 20, "Ana");

    expect(response.data).toHaveLength(1);
    expect(query.mock.calls[0][0]).toContain("FROM fotos_comerciales_productor f");
    expect(query.mock.calls[0][0]).not.toContain("acreedores_cosecha");
    expect(query.mock.calls[0][1]).toEqual(["%Ana%", 20, 0]);
  });
});
