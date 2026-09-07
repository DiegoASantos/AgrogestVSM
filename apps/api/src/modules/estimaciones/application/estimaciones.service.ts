import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

import type { SaveWeekEstimateItemDto } from "../presentation/dto/save-week-estimates.dto";

type EstimateWeekRow = {
  agronomistUserId: string;
  engineerName: string;
  isActive: boolean;
  isEditable: boolean;
  estimatePublicId: string | null;
  estimatedVisits: number | null;
  actualVisits: string | number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  createdByName: string | null;
  updatedByName: string | null;
};

type EligibleUserRow = { id: string };

export type NormalizedWeek = {
  startDate: string;
  endDate: string;
};

@Injectable()
export class EstimacionesService {
  constructor(private readonly dataSource: DataSource) {}

  async getWeek(date: string) {
    const week = normalizeWeek(date);
    const rows = await this.dataSource.query<EstimateWeekRow[]>(
      `WITH agronomos_activos AS (
        SELECT DISTINCT u.id
        FROM usuarios u
        INNER JOIN usuario_roles ur ON ur.usuario_id = u.id
        INNER JOIN roles r ON r.id = ur.rol_id AND r.codigo = 'AGRONOMO'
        WHERE u.activo = true
      ),
      estimaciones_semana AS (
        SELECT e.*
        FROM estimaciones_visitas e
        WHERE e.fecha_inicio = $1
          AND e.activo = true
      ),
      candidatos AS (
        SELECT id FROM agronomos_activos
        UNION
        SELECT agronomo_usuario_id FROM estimaciones_semana
      ),
      visitas_reales AS (
        SELECT v.agronomo_usuario_id, COUNT(v.id) AS cantidad
        FROM visitas_campo v
        WHERE v.activo = true
          AND v.fecha_visita >= $1
          AND v.fecha_visita <= $2
        GROUP BY v.agronomo_usuario_id
      )
      SELECT
        u.id AS "agronomistUserId",
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', u.nombres, u.apellidos)), ''),
          'Ingeniero sin nombre'
        ) AS "engineerName",
        u.activo AS "isActive",
        (aa.id IS NOT NULL) AS "isEditable",
        e.public_id AS "estimatePublicId",
        e.visitas_estimadas AS "estimatedVisits",
        COALESCE(vr.cantidad, 0) AS "actualVisits",
        e.creado_at AS "createdAt",
        e.actualizado_at AS "updatedAt",
        CASE WHEN e.id IS NULL THEN NULL ELSE COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', creador.nombres, creador.apellidos)), ''),
          'Usuario sin nombre'
        ) END AS "createdByName",
        CASE WHEN e.id IS NULL THEN NULL ELSE COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', editor.nombres, editor.apellidos)), ''),
          'Usuario sin nombre'
        ) END AS "updatedByName"
      FROM candidatos c
      INNER JOIN usuarios u ON u.id = c.id
      LEFT JOIN agronomos_activos aa ON aa.id = u.id
      LEFT JOIN estimaciones_semana e ON e.agronomo_usuario_id = u.id
      LEFT JOIN visitas_reales vr ON vr.agronomo_usuario_id = u.id
      LEFT JOIN usuarios creador ON creador.id = e.creado_por_usuario_id
      LEFT JOIN usuarios editor ON editor.id = e.actualizado_por_usuario_id
      ORDER BY (aa.id IS NOT NULL) DESC, "engineerName" ASC`,
      [week.startDate, week.endDate]
    );

    const normalizedRows = rows.map((row) => {
      const estimatedVisits =
        row.estimatedVisits === null ? null : Number(row.estimatedVisits);
      const actualVisits = Number(row.actualVisits);

      return {
        ...row,
        estimatedVisits,
        actualVisits,
        difference: estimatedVisits === null ? null : actualVisits - estimatedVisits,
        compliancePercentage:
          estimatedVisits === null || estimatedVisits === 0
            ? null
            : Number(((actualVisits / estimatedVisits) * 100).toFixed(2))
      };
    });
    const totalEstimatedVisits = normalizedRows.reduce(
      (total, row) => total + (row.estimatedVisits ?? 0),
      0
    );
    const totalActualVisits = normalizedRows.reduce(
      (total, row) => total + row.actualVisits,
      0
    );

    return {
      ...week,
      totals: {
        agronomists: normalizedRows.length,
        withEstimate: normalizedRows.filter((row) => row.estimatedVisits !== null).length,
        estimatedVisits: totalEstimatedVisits,
        actualVisits: totalActualVisits,
        difference: totalActualVisits - totalEstimatedVisits
      },
      rows: normalizedRows
    };
  }

  async saveWeek(
    date: string,
    estimates: SaveWeekEstimateItemDto[],
    actorUserId: string
  ) {
    const week = normalizeWeek(date);
    const userIds = estimates.map((item) => item.agronomoUsuarioId);

    if (new Set(userIds).size !== userIds.length) {
      throw new BadRequestException(
        "Cada agronomo puede aparecer una sola vez en el lote."
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await this.ensureActorCanManage(manager, actorUserId);
      await this.ensureEligibleAgronomists(manager, userIds);

      for (const estimate of estimates) {
        if (estimate.visitasEstimadas === null) {
          await manager.query(
            `UPDATE estimaciones_visitas
             SET activo = false,
                 actualizado_por_usuario_id = $3,
                 actualizado_at = now()
             WHERE agronomo_usuario_id = $1
               AND fecha_inicio = $2
               AND activo = true`,
            [estimate.agronomoUsuarioId, week.startDate, actorUserId]
          );
          continue;
        }

        await manager.query(
          `INSERT INTO estimaciones_visitas (
             agronomo_usuario_id,
             fecha_inicio,
             fecha_fin,
             visitas_estimadas,
             creado_por_usuario_id,
             actualizado_por_usuario_id,
             activo
           ) VALUES ($1, $2, $3, $4, $5, $5, true)
           ON CONFLICT (agronomo_usuario_id, fecha_inicio)
           DO UPDATE SET
             fecha_fin = EXCLUDED.fecha_fin,
             visitas_estimadas = EXCLUDED.visitas_estimadas,
             actualizado_por_usuario_id = EXCLUDED.actualizado_por_usuario_id,
             activo = true,
             actualizado_at = now()`,
          [
            estimate.agronomoUsuarioId,
            week.startDate,
            week.endDate,
            estimate.visitasEstimadas,
            actorUserId
          ]
        );
      }
    });

    return this.getWeek(week.startDate);
  }

  private async ensureActorCanManage(manager: EntityManager, actorUserId: string) {
    const rows = await manager.query<EligibleUserRow[]>(
      `SELECT DISTINCT u.id
       FROM usuarios u
       INNER JOIN usuario_roles ur ON ur.usuario_id = u.id
       INNER JOIN roles r ON r.id = ur.rol_id
       WHERE u.id = $1
         AND u.activo = true
         AND r.codigo IN ('ADMIN', 'ANALISTA')`,
      [actorUserId]
    );

    if (rows.length === 0) {
      throw new ForbiddenException("No tienes permisos para administrar estimaciones.");
    }
  }

  private async ensureEligibleAgronomists(manager: EntityManager, userIds: string[]) {
    const rows = await manager.query<EligibleUserRow[]>(
      `SELECT DISTINCT u.id
       FROM usuarios u
       INNER JOIN usuario_roles ur ON ur.usuario_id = u.id
       INNER JOIN roles r ON r.id = ur.rol_id AND r.codigo = 'AGRONOMO'
       WHERE u.activo = true
         AND u.id = ANY($1::bigint[])`,
      [userIds]
    );

    if (rows.length !== userIds.length) {
      throw new BadRequestException(
        "Todas las estimaciones deben pertenecer a agronomos activos."
      );
    }
  }
}

export function normalizeWeek(value: string): NormalizedWeek {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException("La fecha debe usar el formato YYYY-MM-DD.");
  }

  const selectedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime()) || formatDate(selectedDate) !== value) {
    throw new BadRequestException("La fecha seleccionada no es valida.");
  }

  const isoDay = selectedDate.getUTCDay() || 7;
  const start = new Date(selectedDate);
  start.setUTCDate(selectedDate.getUTCDate() - (isoDay - 1));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
