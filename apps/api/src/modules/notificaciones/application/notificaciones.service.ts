import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import type { MarcarVisitaDuplicadaLeidaDto } from "../presentation/dto/marcar-visita-duplicada-leida.dto";

type NoticeRow = {
  kind: "VISITAS_DUPLICADAS" | "PRODUCTOR_SIN_VISITA";
  key: string;
  productorId: string;
  productorNombre: string;
  agronomos: string[];
  agronomoUsuarioId: string | null;
  agronomoNombre: string | null;
  fechaVisita: string | null;
  cantidadVisitas: number | null;
  fechaBase: string | null;
  fechaVencimiento: string | null;
  sortDate: string;
};

type ListRow = { items: NoticeRow[]; unread_count: string };

const NOTICES_SQL = `
  WITH duplicadas AS (
    SELECT parcela.productor_id AS productor_id,
           visita.fecha_visita AS fecha_visita,
           COUNT(*)::integer AS cantidad,
           jsonb_agg(DISTINCT TRIM(CONCAT_WS(' ', agronomo.nombres, agronomo.apellidos))) AS agronomos,
           MIN(visita.agronomo_usuario_id)::text AS agronomo_usuario_id,
           string_agg(DISTINCT TRIM(CONCAT_WS(' ', agronomo.nombres, agronomo.apellidos)), ', ') AS agronomo_nombre
    FROM visitas_campo visita
    JOIN parcelas parcela ON parcela.id = visita.parcela_id
    JOIN usuarios agronomo ON agronomo.id = visita.agronomo_usuario_id
    WHERE visita.activo = true
    GROUP BY parcela.productor_id, visita.fecha_visita
    HAVING COUNT(*) >= 2
  ), elegibles AS (
    SELECT productor.id AS productor_id,
           TRIM(CONCAT_WS(' ', productor.nombres, productor.apellidos)) AS nombre,
           GREATEST(
             (productor.creado_at AT TIME ZONE 'America/Lima')::date,
             COALESCE(ultima_visita.fecha, DATE '0001-01-01'),
             COALESCE((productor.ultima_confirmacion_continuidad_at AT TIME ZONE 'America/Lima')::date, DATE '0001-01-01')
           ) AS fecha_base
    FROM productores productor
    LEFT JOIN LATERAL (
      SELECT MAX(visita.fecha_visita) AS fecha
      FROM parcelas parcela
      JOIN visitas_campo visita ON visita.parcela_id = parcela.id AND visita.activo = true
      WHERE parcela.productor_id = productor.id
    ) ultima_visita ON true
    WHERE productor.entidad = 'persona' AND productor.activo = true
      AND EXISTS (
        SELECT 1 FROM parcelas parcela
        WHERE parcela.productor_id = productor.id AND parcela.activo = true
      )
  ), avisos AS (
    SELECT 'VISITAS_DUPLICADAS'::text AS kind,
           CONCAT_WS(':', duplicadas.productor_id, duplicadas.fecha_visita) AS key,
           duplicadas.productor_id::text AS "productorId",
           TRIM(CONCAT_WS(' ', productor.nombres, productor.apellidos)) AS "productorNombre",
           duplicadas.agronomos AS agronomos,
           duplicadas.agronomo_usuario_id AS "agronomoUsuarioId",
           duplicadas.agronomo_nombre AS "agronomoNombre",
           duplicadas.fecha_visita::text AS "fechaVisita",
           duplicadas.cantidad AS "cantidadVisitas",
           NULL::text AS "fechaBase", NULL::text AS "fechaVencimiento",
           duplicadas.fecha_visita::text AS "sortDate"
    FROM duplicadas
    JOIN productores productor ON productor.id = duplicadas.productor_id
    LEFT JOIN notificaciones_visitas_productor_leidas leida
      ON leida.usuario_id = $1 AND leida.productor_id = duplicadas.productor_id
      AND leida.fecha_visita = duplicadas.fecha_visita
    WHERE leida.usuario_id IS NULL
    UNION ALL
    SELECT 'PRODUCTOR_SIN_VISITA'::text AS kind,
           elegibles.productor_id::text AS key,
           elegibles.productor_id::text AS "productorId",
           elegibles.nombre AS "productorNombre",
           '[]'::jsonb AS agronomos,
           NULL::text AS "agronomoUsuarioId", NULL::text AS "agronomoNombre",
           NULL::text AS "fechaVisita", NULL::integer AS "cantidadVisitas",
           elegibles.fecha_base::text AS "fechaBase",
           (elegibles.fecha_base + 45)::text AS "fechaVencimiento",
           (elegibles.fecha_base + 45)::text AS "sortDate"
    FROM elegibles
    WHERE elegibles.fecha_base + 45 <= (now() AT TIME ZONE 'America/Lima')::date
  ), filtrados AS (
    SELECT * FROM avisos WHERE $4::text IS NULL OR kind = $4::text
  )
  SELECT COALESCE(json_agg(pagina.*), '[]'::json) AS items,
         (SELECT COUNT(*)::text FROM filtrados) AS unread_count
  FROM (
    SELECT * FROM filtrados ORDER BY "sortDate" DESC, kind, key
    LIMIT $2 OFFSET $3
  ) pagina
`;

@Injectable()
export class NotificacionesService {
  constructor(private readonly dataSource: DataSource) {}

  async list(userId: string, rawLimit?: string, rawCursor?: string, kind?: string) {
    const limit = this.parseNumber(rawLimit, 50, 1, 50);
    const offset = this.parseNumber(rawCursor, 0, 0, 1000000);
    if (kind !== undefined && kind !== "VISITAS_DUPLICADAS" && kind !== "PRODUCTOR_SIN_VISITA") {
      throw new BadRequestException("Tipo de aviso invalido.");
    }
    const [row] = await this.dataSource.query(NOTICES_SQL, [userId, limit, offset, kind ?? null]) as ListRow[];
    const items = row?.items ?? [];
    const unreadCount = Number(row?.unread_count ?? 0);
    return createSuccessResponse({
      items,
      unreadCount,
      nextCursor: offset + items.length < unreadCount ? String(offset + items.length) : null
    });
  }

  async markRead(userId: string, dto: MarcarVisitaDuplicadaLeidaDto) {
    const maxId = 9223372036854775807n;
    if (BigInt(dto.productorId) > maxId) {
      throw new BadRequestException("Identificador fuera de rango.");
    }
    const date = new Date(`${dto.fechaVisita}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dto.fechaVisita) {
      throw new BadRequestException("Fecha de visita invalida.");
    }
    const result = await this.dataSource.query(`
      WITH grupo AS (
        SELECT visita.agronomo_usuario_id
        FROM visitas_campo visita
        JOIN parcelas parcela ON parcela.id = visita.parcela_id
        WHERE visita.activo = true AND parcela.productor_id = $2
          AND visita.fecha_visita = $3::date
      ), lectura AS (
      INSERT INTO notificaciones_visitas_productor_leidas
        (usuario_id, productor_id, fecha_visita)
      SELECT $1, $2, $3::date
      WHERE (SELECT COUNT(*) FROM grupo) >= 2
      ON CONFLICT (usuario_id, productor_id, fecha_visita)
      DO UPDATE SET leido_at = notificaciones_visitas_productor_leidas.leido_at
      RETURNING usuario_id
      ), lectura_anterior AS (
        INSERT INTO notificaciones_visitas_leidas
          (usuario_id, productor_id, agronomo_usuario_id, fecha_visita)
        SELECT $1, $2, agronomo_usuario_id, $3::date
        FROM grupo WHERE EXISTS (SELECT 1 FROM lectura)
        GROUP BY agronomo_usuario_id
        ON CONFLICT (usuario_id, productor_id, agronomo_usuario_id, fecha_visita) DO NOTHING
      )
      SELECT usuario_id FROM lectura
    `, [userId, dto.productorId, dto.fechaVisita]) as Array<{ usuario_id: string }>;
    if (result.length === 0) {
      throw new NotFoundException("El aviso de visitas repetidas ya no esta disponible.");
    }
    return createSuccessResponse({ read: true });
  }

  private parseNumber(raw: string | undefined, fallback: number, min: number, max: number) {
    if (raw === undefined) return fallback;
    if (!/^(0|[1-9]\d*)$/.test(raw)) throw new BadRequestException("Paginacion invalida.");
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new BadRequestException("Paginacion fuera de rango.");
    }
    return value;
  }
}
