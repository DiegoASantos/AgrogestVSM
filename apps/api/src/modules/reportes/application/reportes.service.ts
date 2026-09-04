import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

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
