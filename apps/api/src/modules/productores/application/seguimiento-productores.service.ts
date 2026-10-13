import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";

type PendingRow = {
  productor_id: string;
  nombre: string;
  fecha_base: string;
  fecha_vencimiento: string;
};

type CurrentUser = { userId: string; roles: string[] };

const PENDING_SQL = `
  WITH elegibles AS (
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
    WHERE productor.entidad = 'persona'
      AND EXISTS (
        SELECT 1 FROM parcelas asignada
        WHERE asignada.productor_id = productor.id
          AND asignada.agronomo_usuario_id = $1
          AND asignada.activo = true
      )
  )
  SELECT productor_id, nombre, fecha_base::text AS fecha_base,
         (fecha_base + 45)::text AS fecha_vencimiento
  FROM elegibles
  WHERE fecha_base + 45 <= (now() AT TIME ZONE 'America/Lima')::date
  ORDER BY fecha_vencimiento, productor_id
`;

@Injectable()
export class SeguimientoProductoresService {
  constructor(private readonly dataSource: DataSource) {}

  async findPending(currentUser: CurrentUser) {
    const rows = await this.dataSource.query(PENDING_SQL, [currentUser.userId]) as PendingRow[];
    return createSuccessResponse(rows.map((row) => ({
      productorId: row.productor_id,
      name: row.nombre,
      baseDate: row.fecha_base,
      dueDate: row.fecha_vencimiento
    })));
  }

  async respond(productorId: string, decision: "si" | "no", currentUser: CurrentUser) {
    return this.dataSource.transaction(async (manager) => {
      const productores = await manager.query(
        `SELECT id FROM productores
         WHERE id = $1 AND entidad = 'persona'
           AND EXISTS (
             SELECT 1 FROM parcelas
             WHERE productor_id = $1 AND agronomo_usuario_id = $2 AND activo = true
           )
         FOR UPDATE`,
        [productorId, currentUser.userId]
      ) as Array<{ id: string }>;
      if (productores.length === 0) {
        throw new NotFoundException("Productor not found.");
      }

      const pending = await manager.query(PENDING_SQL, [currentUser.userId]) as PendingRow[];
      if (!pending.some((row) => row.productor_id === productorId)) {
        throw new ConflictException("El aviso ya no esta pendiente para este productor.");
      }

      if (decision === "si") {
        await manager.query(
          "UPDATE productores SET ultima_confirmacion_continuidad_at = now(), actualizado_at = now() WHERE id = $1",
          [productorId]
        );
        return createSuccessResponse({ productorId, decision, deactivatedParcelIds: [] });
      }

      const [changed] = await manager.query(
        `UPDATE parcelas SET activo = false, actualizado_at = now()
         WHERE productor_id = $1 AND agronomo_usuario_id = $2 AND activo = true
         RETURNING id`,
        [productorId, currentUser.userId]
      ) as [Array<{ id: string }>, number];
      const [updated] = await manager.query(
        `UPDATE productores SET activo = EXISTS (
           SELECT 1 FROM parcelas WHERE productor_id = $1 AND activo = true
         ), actualizado_at = now() WHERE id = $1 RETURNING activo`,
        [productorId]
      ) as [Array<{ activo: boolean }>, number];
      return createSuccessResponse({
        productorId,
        decision,
        deactivatedParcelIds: changed.map((row) => row.id),
        producerIsActive: updated[0]?.activo ?? false
      });
    });
  }
}
