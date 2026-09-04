import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { ReporteCamposEtapasQueryDto } from "../presentation/dto/reporte-campos-etapas-query.dto";
import { ReporteVisitasQueryDto } from "../presentation/dto/reporte-visitas-query.dto";

type VisitSummaryRow = {
  agronomistUserId: string;
  engineerName: string;
  visitsCount: string;
  visitDays: string;
};

type VisitTimelineRow = {
  visitDate: string;
  hectares: string;
  visitsCount: string;
};

type StageCatalogRow = {
  id: string;
  name: string;
  type: "Etapa" | "Labor";
  sortOrder: string | null;
};

type ActiveAgronomistRow = {
  agronomistUserId: string;
  engineerName: string;
};

type LatestParcelStageRow = {
  parcelId: string;
  parcelCode: string;
  parcelName: string | null;
  productorId: string;
  productorName: string;
  agronomistUserId: string;
  engineerName: string;
  stageId: string | null;
  stageName: string | null;
  geometry: unknown | null;
  parcelPoint: unknown | null;
  referencePoint: unknown | null;
};

@Injectable()
export class ReportesService {
  constructor(private readonly dataSource: DataSource) {}

  async getVisitsReport(query: ReporteVisitasQueryDto) {
    this.ensureDateRange(query);

    const [summaryRows, timelineRows] = await Promise.all([
      this.getVisitSummary(query),
      this.getVisitTimeline(query)
    ]);

    return {
      summary: summaryRows.map((row) => {
        const visitsCount = Number(row.visitsCount);
        const visitDays = Number(row.visitDays);

        return {
          agronomistUserId: row.agronomistUserId,
          engineerName: row.engineerName,
          visitsCount,
          visitDays,
          dailyAverage: visitDays === 0 ? 0 : Number((visitsCount / visitDays).toFixed(2))
        };
      }),
      timeline: timelineRows.map((row) => ({
        visitDate: row.visitDate,
        hectares: Number(row.hectares),
        visitsCount: Number(row.visitsCount)
      }))
    };
  }

  async getFieldsByStageReport(query: ReporteCamposEtapasQueryDto) {
    const [stageRows, agronomistRows, parcelRows] = await Promise.all([
      this.getActiveStages(),
      this.getActiveAgronomists(query),
      this.getLatestParcelStages(query)
    ]);
    const stages = stageRows.map((stage) => ({
      ...stage,
      sortOrder: stage.sortOrder === null ? null : Number(stage.sortOrder)
    }));
    const activeStageIds = new Set(stages.map((stage) => stage.id));
    const activeAgronomistIds = new Set(
      agronomistRows.map((agronomist) => agronomist.agronomistUserId)
    );
    const participatingParcels = parcelRows.filter((parcel) =>
      activeAgronomistIds.has(parcel.agronomistUserId)
    );
    const categorizedParcels = participatingParcels.filter(
      (parcel): parcel is LatestParcelStageRow & { stageId: string; stageName: string } =>
        parcel.stageId !== null &&
        parcel.stageName !== null &&
        activeStageIds.has(parcel.stageId)
    );
    const totalCategorizedParcels = categorizedParcels.length;
    const totalsByStage = new Map(stages.map((stage) => [stage.id, 0]));
    const countsByAgronomist = new Map(
      agronomistRows.map((agronomist) => [
        agronomist.agronomistUserId,
        new Map(stages.map((stage) => [stage.id, 0]))
      ])
    );

    for (const parcel of categorizedParcels) {
      totalsByStage.set(parcel.stageId, (totalsByStage.get(parcel.stageId) ?? 0) + 1);
      const agronomistCounts = countsByAgronomist.get(parcel.agronomistUserId);
      if (agronomistCounts) {
        agronomistCounts.set(
          parcel.stageId,
          (agronomistCounts.get(parcel.stageId) ?? 0) + 1
        );
      }
    }

    return {
      stages,
      summary: {
        totalCategorizedParcels,
        uncategorizedParcels: participatingParcels.length - categorizedParcels.length,
        byStage: stages.map((stage) => {
          const count = totalsByStage.get(stage.id) ?? 0;
          return {
            stageId: stage.id,
            count,
            percentage: percentage(count, totalCategorizedParcels)
          };
        }),
        byEngineer: agronomistRows.map((agronomist) => {
          const counts = countsByAgronomist.get(agronomist.agronomistUserId);
          const totalParcels = [...(counts?.values() ?? [])].reduce(
            (total, count) => total + count,
            0
          );

          return {
            ...agronomist,
            totalParcels,
            stages: stages.map((stage) => {
              const count = counts?.get(stage.id) ?? 0;
              return {
                stageId: stage.id,
                count,
                percentageOfFilteredTotal: percentage(count, totalCategorizedParcels),
                percentageOfEngineer: percentage(count, totalParcels)
              };
            })
          };
        })
      },
      parcels: categorizedParcels.map((parcel) => ({
        parcelId: parcel.parcelId,
        parcelCode: parcel.parcelCode,
        parcelName: parcel.parcelName,
        productorId: parcel.productorId,
        productorName: parcel.productorName,
        agronomistUserId: parcel.agronomistUserId,
        engineerName: parcel.engineerName,
        stageId: parcel.stageId,
        stageName: parcel.stageName,
        geometry: parcel.geometry,
        parcelPoint: parcel.parcelPoint,
        referencePoint: parcel.referencePoint
      }))
    };
  }

  private getActiveStages() {
    return this.dataSource.query<StageCatalogRow[]>(
      `SELECT
        e.id AS "id",
        e.nombre AS "name",
        e.tipo AS "type",
        e.orden AS "sortOrder"
      FROM etapas_fenologicas e
      WHERE e.activo = true
      ORDER BY e.orden ASC NULLS LAST, e.id ASC`
    );
  }

  private getActiveAgronomists(query: ReporteCamposEtapasQueryDto) {
    const values: string[] = [];
    const filters = ["u.activo = true"];

    if (query.agronomo_usuario_id) {
      values.push(query.agronomo_usuario_id);
      filters.push(`u.id = $${values.length}`);
    }

    return this.dataSource.query<ActiveAgronomistRow[]>(
      `SELECT DISTINCT
        u.id AS "agronomistUserId",
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', u.nombres, u.apellidos)), ''),
          'Ingeniero sin nombre'
        ) AS "engineerName"
      FROM usuarios u
      INNER JOIN usuario_roles ur ON ur.usuario_id = u.id
      INNER JOIN roles r ON r.id = ur.rol_id AND r.codigo = 'AGRONOMO'
      WHERE ${filters.join(" AND ")}
      ORDER BY "engineerName" ASC`,
      values
    );
  }

  private getLatestParcelStages(query: ReporteCamposEtapasQueryDto) {
    const values: string[] = [];
    const parcelFilters = [
      "v.activo = true",
      "p.activo = true",
      "productor.activo = true"
    ];
    const reportFilters: string[] = [];

    if (query.productor_id) {
      values.push(query.productor_id);
      parcelFilters.push(`p.productor_id = $${values.length}`);
    }

    if (query.agronomo_usuario_id) {
      values.push(query.agronomo_usuario_id);
      reportFilters.push(`uv.agronomo_usuario_id = $${values.length}`);
    }

    return this.dataSource.query<LatestParcelStageRow[]>(
      `WITH ultimas_visitas AS (
        SELECT DISTINCT ON (v.parcela_id)
          v.parcela_id,
          v.agronomo_usuario_id,
          v.etapa_fenologica_id
        FROM visitas_campo v
        INNER JOIN parcelas p ON p.id = v.parcela_id
        INNER JOIN productores productor ON productor.id = p.productor_id
        WHERE ${parcelFilters.join(" AND ")}
        ORDER BY v.parcela_id, v.fecha_visita DESC, v.id DESC
      )
      SELECT
        p.id AS "parcelId",
        p.codigo AS "parcelCode",
        p.nombre AS "parcelName",
        productor.id AS "productorId",
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', productor.nombres, productor.apellidos)), ''),
          'Productor sin nombre'
        ) AS "productorName",
        u.id AS "agronomistUserId",
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', u.nombres, u.apellidos)), ''),
          'Ingeniero sin nombre'
        ) AS "engineerName",
        e.id AS "stageId",
        e.nombre AS "stageName",
        ST_AsGeoJSON(p.geometria)::json AS "geometry",
        ST_AsGeoJSON(p.punto_referencia_parcela)::json AS "parcelPoint",
        ST_AsGeoJSON(p.punto_referencia)::json AS "referencePoint"
      FROM ultimas_visitas uv
      INNER JOIN parcelas p ON p.id = uv.parcela_id
      INNER JOIN productores productor ON productor.id = p.productor_id
      INNER JOIN usuarios u ON u.id = uv.agronomo_usuario_id AND u.activo = true
      LEFT JOIN etapas_fenologicas e
        ON e.id = uv.etapa_fenologica_id AND e.activo = true
      WHERE EXISTS (
        SELECT 1
        FROM usuario_roles ur
        INNER JOIN roles r ON r.id = ur.rol_id
        WHERE ur.usuario_id = u.id
          AND r.codigo = 'AGRONOMO'
      )${reportFilters.length > 0 ? ` AND ${reportFilters.join(" AND ")}` : ""}
      ORDER BY "engineerName" ASC, p.codigo ASC`,
      values
    );
  }

  private getVisitSummary(query: ReporteVisitasQueryDto) {
    const values: string[] = [query.fecha_desde, query.fecha_hasta];
    const visitConditions = [
      "v.agronomo_usuario_id = u.id",
      "v.activo = true",
      "v.fecha_visita >= $1",
      "v.fecha_visita <= $2"
    ];
    const userConditions = ["u.activo = true"];

    if (query.productor_id) {
      values.push(query.productor_id);
      visitConditions.push(
        `EXISTS (
          SELECT 1
          FROM parcelas p
          WHERE p.id = v.parcela_id
            AND p.productor_id = $${values.length}
        )`
      );
    }

    if (query.agronomo_usuario_id) {
      values.push(query.agronomo_usuario_id);
      userConditions.push(`u.id = $${values.length}`);
    }

    return this.dataSource.query<VisitSummaryRow[]>(
      `SELECT
        u.id AS "agronomistUserId",
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', u.nombres, u.apellidos)), ''),
          'Ingeniero sin nombre'
        ) AS "engineerName",
        COUNT(v.id) AS "visitsCount",
        COUNT(DISTINCT v.fecha_visita) AS "visitDays"
      FROM usuarios u
      INNER JOIN usuario_roles ur ON ur.usuario_id = u.id
      INNER JOIN roles r ON r.id = ur.rol_id AND r.codigo = 'AGRONOMO'
      LEFT JOIN visitas_campo v ON ${visitConditions.join(" AND ")}
      WHERE ${userConditions.join(" AND ")}
      GROUP BY u.id, u.nombres, u.apellidos
      ORDER BY "visitsCount" DESC, "engineerName" ASC`,
      values
    );
  }

  private getVisitTimeline(query: ReporteVisitasQueryDto) {
    const values: string[] = [query.fecha_desde, query.fecha_hasta];
    const filters = ["v.activo = true", "v.fecha_visita >= $1", "v.fecha_visita <= $2"];

    if (query.agronomo_usuario_id) {
      values.push(query.agronomo_usuario_id);
      filters.push(`v.agronomo_usuario_id = $${values.length}`);
    }

    if (query.productor_id) {
      values.push(query.productor_id);
      filters.push(`p.productor_id = $${values.length}`);
    }

    return this.dataSource.query<VisitTimelineRow[]>(
      `SELECT
        TO_CHAR(v.fecha_visita, 'YYYY-MM-DD') AS "visitDate",
        ROUND(COALESCE(SUM(v.area_ha), 0), 2) AS "hectares",
        COUNT(v.id) AS "visitsCount"
      FROM visitas_campo v
      INNER JOIN parcelas p ON p.id = v.parcela_id
      WHERE ${filters.join(" AND ")}
      GROUP BY v.fecha_visita
      ORDER BY v.fecha_visita ASC`,
      values
    );
  }

  private ensureDateRange(query: ReporteVisitasQueryDto) {
    if (query.fecha_desde > query.fecha_hasta) {
      throw new BadRequestException(
        "fecha_hasta must be greater than or equal to fecha_desde."
      );
    }
  }
}

function percentage(count: number, total: number) {
  return total === 0 ? 0 : Number(((count / total) * 100).toFixed(2));
}
