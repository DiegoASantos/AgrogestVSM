import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, In } from "typeorm";
import { createSuccessResponse } from "../../../common/http/api-response";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { PagoProductorEntity } from "../infrastructure/persistence/entities/pago-productor.entity";
import { VinculoProductorSystraceEntity } from "../infrastructure/persistence/entities/vinculo-productor-systrace.entity";
import {
  RecepcionSystraceClient,
  type SystraceReception
} from "../infrastructure/systrace/recepcion-systrace.client";
import type { FindRecepcionesSystraceQueryDto } from "../presentation/dto/find-recepciones-systrace-query.dto";
import type { VincularProductorSystraceDto } from "../presentation/dto/vincular-productor-systrace.dto";

type Header = {
  sistemaOrigen: "SYSTRACE";
  nroGuia: string;
  lote: string;
  protocolo: string;
  variedad: string;
  tipoCultivo: string;
  categoria: string;
  destino: string;
  fechaCosecha: string;
  fechaRecepcion: string;
  jabas: number;
  pesoBruto: string;
  pesoTara: string;
  pesoNeto: string;
  pesoPromedio: string;
  exportador: string;
  codigoProductorOrigen: string;
  nombreProductorOrigen: string;
};

@Injectable()
export class RecepcionesSystraceService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly client: RecepcionSystraceClient
  ) {}

  async search(query: FindRecepcionesSystraceQueryDto) {
    if (!calendarDate(query.fechaRecepcion)) {
      throw new BadRequestException("Ingresa una fecha de recepción válida.");
    }
    const rows = (await this.client.list()).filter(
      (row) => row.fecharecepcion === query.fechaRecepcion
    );
    const producers = new Map<string, string>();
    for (const row of rows) {
      const code = text(row.codigo_productor, 150);
      const name = text(row.nombre, 250);
      if (code && name) producers.set(code, name);
    }
    const producerCodes = [...producers.keys()];
    const links = producerCodes.length
      ? await this.dataSource.getRepository(VinculoProductorSystraceEntity).find({
          where: { sourceProducerCode: In(producerCodes) }
        })
      : [];
    const internalIds = [...new Set(links.map((link) => link.productorId))];
    const internalProducers = internalIds.length
      ? await this.dataSource.getRepository(ProductorEntity).find({
          where: { id: In(internalIds) }
        })
      : [];
    const internalById = new Map(internalProducers.map((producer) => [producer.id, producer]));
    const linkByCode = new Map(links.map((link) => [link.sourceProducerCode, link]));
    const selected = query.codigoProductor
      ? rows.filter((row) => row.codigo_productor === query.codigoProductor)
      : [];
    const total = selected.length;
    const page = selected.slice(query.skip, query.skip + query.take);
    const pageGuides = [...new Set(page.map((row) => row.nroguia).filter((value): value is string => typeof value === "string"))];
    const existing = pageGuides.length
      ? await this.dataSource.getRepository(PagoProductorEntity).find({
          where: { sourceSystem: "SYSTRACE", guideNumber: In(pageGuides) },
          select: { publicId: true, guideNumber: true, lot: true }
        })
      : [];
    const existingByKey = new Map(
      existing.map((payment) => [key(payment.guideNumber, payment.lot), payment.publicId])
    );
    return createSuccessResponse({
      productores: producerCodes.sort((a, b) => producers.get(a)!.localeCompare(producers.get(b)!))
        .map((code) => {
          const link = linkByCode.get(code);
          const internal = link ? internalById.get(link.productorId) : undefined;
          return {
            codigo: code,
            nombre: producers.get(code)!,
            productorId: internal?.publicId ?? null,
            productorNombre: internal ? producerName(internal) : null,
            productorActivo: internal?.isActive ?? null
          };
        }),
      recepciones: page.map((row) => {
        const cabecera = toHeader(row);
        return {
          nroGuia: text(row.nroguia, 150) ?? "",
          lote: text(row.lote, 150) ?? "",
          cabecera,
          invalida: !cabecera,
          pagoExistenteId: existingByKey.get(key(String(row.nroguia ?? ""), String(row.lote ?? ""))) ?? null
        };
      }),
      total,
      page: query.page,
      limit: query.limit
    });
  }

  async link(dto: VincularProductorSystraceDto, userId: string) {
    const code = dto.codigoProductor.trim();
    if (!code || code.length > 150) throw new BadRequestException("Código de productor inválido.");
    const sourceExists = (await this.client.list()).some((row) => row.codigo_productor === code);
    if (!sourceExists) throw new NotFoundException("Productor de Systrace no encontrado.");
    return this.dataSource.transaction(async (manager) => {
      const producer = await manager.getRepository(ProductorEntity).findOne({
        where: { publicId: dto.productorId }
      });
      if (!producer) throw new NotFoundException("Productor de AgroGest no encontrado.");
      if (producer.mergedIntoId) throw new ConflictException("Selecciona la ficha principal del productor.");
      if (!producer.isActive && !dto.confirmarInactivo) {
        throw new ConflictException("Confirma expresamente el vínculo con un productor inactivo.");
      }
      await manager.query(`INSERT INTO vinculos_productores_systrace
        (codigo_productor_systrace, productor_id, creado_por_usuario_id, actualizado_por_usuario_id)
        VALUES ($1, $2, $3, $3) ON CONFLICT (codigo_productor_systrace) DO NOTHING`,
      [code, producer.id, userId]);
      const [current] = await manager.query(`SELECT id::text, productor_id::text AS "productorId"
        FROM vinculos_productores_systrace WHERE codigo_productor_systrace = $1 FOR UPDATE`,
      [code]) as Array<{ id: string; productorId: string }>;
      if (!current) throw new ConflictException("No se pudo establecer el vínculo.");
      if (current.productorId !== producer.id) {
        if (!dto.confirmarCorreccion) {
          throw new ConflictException("Este código Systrace ya está vinculado a otro productor.");
        }
        await manager.query(`INSERT INTO vinculos_productores_systrace_cambios
          (vinculo_id, productor_anterior_id, productor_nuevo_id, usuario_id)
          VALUES ($1, $2, $3, $4)`, [current.id, current.productorId, producer.id, userId]);
        await manager.query(`UPDATE vinculos_productores_systrace SET productor_id = $2,
          actualizado_por_usuario_id = $3, actualizado_at = now() WHERE id = $1`,
        [current.id, producer.id, userId]);
      }
      return createSuccessResponse({
        codigo: code,
        productorId: producer.publicId,
        productorNombre: producerName(producer),
        productorActivo: producer.isActive
      });
    });
  }
}

function key(guide: string, lot: string): string {
  return `${guide}\u0000${lot}`;
}

function producerName(producer: ProductorEntity): string {
  return [producer.firstName, producer.lastName].filter(Boolean).join(" ") || producer.entityType;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function decimal(value: unknown): string | null {
  const normalized = typeof value === "number" ? String(value) : value;
  if (typeof normalized !== "string" ||
      !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(normalized)) return null;
  return normalized;
}

function calendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toHeader(row: SystraceReception): Header | null {
  const fields = {
    sistemaOrigen: "SYSTRACE" as const,
    nroGuia: text(row.nroguia, 150),
    lote: text(row.lote, 150),
    protocolo: text(row.protocolo, 10),
    variedad: text(row.nombre_variedad, 150),
    tipoCultivo: text(row.tipo_cultivo, 150),
    categoria: text(row.categoria, 50),
    destino: text(row.codigo_destino, 150),
    fechaCosecha: row.fechacosecha,
    fechaRecepcion: row.fecharecepcion,
    jabas: row.totaljabas,
    pesoBruto: decimal(row.totalpbruto),
    pesoTara: decimal(row.totalptara),
    pesoNeto: decimal(row.totalpneto),
    pesoPromedio: decimal(row.peso_promedio),
    exportador: text(row.codigo_exportador, 10),
    codigoProductorOrigen: text(row.codigo_productor, 150),
    nombreProductorOrigen: text(row.nombre, 250)
  };
  if (Object.values(fields).some((value) => value === null) ||
      !calendarDate(fields.fechaCosecha) || !calendarDate(fields.fechaRecepcion) ||
      !Number.isInteger(fields.jabas) || (fields.jabas as number) < 0) return null;
  return fields as Header;
}
