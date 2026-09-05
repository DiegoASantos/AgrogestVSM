import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { ReporteCamposEtapasQueryDto } from "../presentation/dto/reporte-campos-etapas-query.dto";
import { ReporteParcelasQueryDto } from "../presentation/dto/reporte-parcelas-query.dto";
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

const PARCEL_AREA_CATEGORIES = [
  { code: "MICRO", name: "Micro" },
  { code: "PEQUENO", name: "Pequeño" },
  { code: "MEDIANO", name: "Mediano" },
  { code: "GRANDE", name: "Grande" }
] as const;

export type ParcelAreaCategoryCode = (typeof PARCEL_AREA_CATEGORIES)[number]["code"];

type ParcelReportRow = {
  parcelId: string;
  parcelCode: string;
  parcelName: string | null;
  productorId: string;
  productorName: string;
  sectorId: string;
  sectorName: string;
  subsectorId: string;
  subsectorName: string;
  agronomistUserId: string | null;
  engineerName: string;
  areaHectares: string | null;
  isActive: boolean;
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
    this.ensureDateRange(query);
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

  async getParcelsReport(query: ReporteParcelasQueryDto) {
    this.ensureDateRange(query);
    const rows = (await this.getParcelsForReport(query)).filter(
      (row): row is ParcelReportRow & { agronomistUserId: string } =>
        row.agronomistUserId !== null
    );
    const engineers = new Map<
      string,
      {
        agronomistUserId: string;
        engineerName: string;
        hectares: number;
        parcelsCount: number;
      }
    >();
    const distributions = new Map(
      PARCEL_AREA_CATEGORIES.map((category) => [
        category.code,
        { ...category, parcelsCount: 0, hectares: 0 }
      ])
    );
    const categorizedParcels: Array<
      Omit<ParcelReportRow, "areaHectares"> & {
        areaHectares: number;
        category: ParcelAreaCategoryCode;
        categoryName: string;
      }
    > = [];
    let totalHectares = 0;
    let uncategorizedParcels = 0;
    let categorizedWithoutGeodata = 0;

    for (const row of rows) {
      const area = normalizePositiveArea(row.areaHectares);
      const engineerKey = row.agronomistUserId;
      const engineer = engineers.get(engineerKey) ?? {
        agronomistUserId: row.agronomistUserId,
        engineerName: row.engineerName,
        hectares: 0,
        parcelsCount: 0
      };
      engineer.parcelsCount += 1;
      engineer.hectares += area ?? 0;
      engineers.set(engineerKey, engineer);
      totalHectares += area ?? 0;

      const category = area === null ? null : classifyParcelArea(area);
      if (!category || area === null) {
        uncategorizedParcels += 1;
        continue;
      }

      const distribution = distributions.get(category)!;
      distribution.parcelsCount += 1;
      distribution.hectares += area;
      const categoryName = PARCEL_AREA_CATEGORIES.find(
        (item) => item.code === category
      )!.name;
      categorizedParcels.push({
        ...row,
        areaHectares: round2(area),
        category,
        categoryName
      });
      if (!row.geometry && !row.parcelPoint && !row.referencePoint) {
        categorizedWithoutGeodata += 1;
      }
    }

    const categorizedParcelsCount = categorizedParcels.length;
    const categorizedHectares = [...distributions.values()].reduce(
      (total, item) => total + item.hectares,
      0
    );

    return {
      totals: {
        parcels: rows.length,
        hectares: round2(totalHectares),
        averageHectaresPerParcel:
          rows.length === 0 ? 0 : round2(totalHectares / rows.length),
        categorizedParcels: categorizedParcelsCount,
        uncategorizedParcels,
        categorizedWithoutGeodata
      },
      summary: [...engineers.values()]
        .map((engineer) => ({
          ...engineer,
          hectares: round2(engineer.hectares),
          averageHectaresPerParcel:
            engineer.parcelsCount === 0
              ? 0
              : round2(engineer.hectares / engineer.parcelsCount)
        }))
        .sort(
          (left, right) =>
            right.hectares - left.hectares ||
            left.engineerName.localeCompare(right.engineerName, "es")
        ),
      distribution: [...distributions.values()].map((item) => ({
        code: item.code,
        name: item.name,
        parcelsCount: item.parcelsCount,
        parcelPercentage: percentage(item.parcelsCount, categorizedParcelsCount),
        hectares: round2(item.hectares),
        hectarePercentage: percentage(item.hectares, categorizedHectares)
      })),
      parcels: categorizedParcels
    };
  }

  private getParcelsForReport(query: ReporteParcelasQueryDto) {
    const values: Array<string | boolean> = [];
    const filters = ["p.agronomo_usuario_id IS NOT NULL"];
    const addFilter = (
      value: string | boolean,
      expression: (index: number) => string
    ) => {
      values.push(value);
      filters.push(expression(values.length));
    };

    addFilter(
      query.fecha_desde,
      (index) => `EXISTS (
        SELECT 1
        FROM visitas_campo v
        WHERE v.parcela_id = p.id
          AND v.activo = true
          AND v.fecha_visita >= $${index}
          AND v.fecha_visita <= $${index + 1}
      )`
    );
    values.push(query.fecha_hasta);

    if (query.agronomo_usuario_id) {
      addFilter(
        query.agronomo_usuario_id,
        (index) => `p.agronomo_usuario_id = $${index}`
      );
    }
    if (query.productor_id) {
      addFilter(query.productor_id, (index) => `p.productor_id = $${index}`);
    }
    if (query.sector_id) {
      addFilter(query.sector_id, (index) => `s.id = $${index}`);
    }
    if (query.subsector_id) {
      addFilter(query.subsector_id, (index) => `ss.id = $${index}`);
    }
    if (query.activo !== undefined) {
      addFilter(query.activo, (index) => `p.activo = $${index}`);
    }

    return this.dataSource.query<ParcelReportRow[]>(
      `SELECT
        p.id AS "parcelId",
        p.codigo AS "parcelCode",
        p.nombre AS "parcelName",
        productor.id AS "productorId",
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', productor.nombres, productor.apellidos)), ''),
          'Productor sin nombre'
        ) AS "productorName",
        s.id AS "sectorId",
        s.nombre AS "sectorName",
        ss.id AS "subsectorId",
        ss.nombre AS "subsectorName",
        u.id AS "agronomistUserId",
        CASE
          WHEN u.id IS NULL THEN 'Sin asignar'
          ELSE COALESCE(
            NULLIF(BTRIM(CONCAT_WS(' ', u.nombres, u.apellidos)), ''),
            'Ingeniero sin nombre'
          )
        END AS "engineerName",
        p.area_ha AS "areaHectares",
        p.activo AS "isActive",
        ST_AsGeoJSON(p.geometria)::json AS "geometry",
        ST_AsGeoJSON(p.punto_referencia_parcela)::json AS "parcelPoint",
        ST_AsGeoJSON(p.punto_referencia)::json AS "referencePoint"
      FROM parcelas p
      INNER JOIN productores productor ON productor.id = p.productor_id
      INNER JOIN subsectores ss ON ss.id = p.subsector_id
      INNER JOIN sectores s ON s.id = ss.sector_id
      LEFT JOIN usuarios u ON u.id = p.agronomo_usuario_id
      WHERE ${filters.join(" AND ")}
      ORDER BY "engineerName" ASC, p.codigo ASC`,
      values
    );
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

    values.push(query.fecha_desde);
    parcelFilters.push(`v.fecha_visita >= $${values.length}`);
    values.push(query.fecha_hasta);
    parcelFilters.push(`v.fecha_visita <= $${values.length}`);

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

  private ensureDateRange(
    query: Pick<ReporteVisitasQueryDto, "fecha_desde" | "fecha_hasta">
  ) {
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

export function classifyParcelArea(area: number): ParcelAreaCategoryCode | null {
  if (!Number.isFinite(area) || area <= 0) return null;
  if (area < 4) return "MICRO";
  if (area < 7) return "PEQUENO";
  if (area < 10) return "MEDIANO";
  return "GRANDE";
}

function normalizePositiveArea(value: string | null) {
  if (value === null) return null;
  const area = Number(value);
  return Number.isFinite(area) && area > 0 ? area : null;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
