import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  type ProductorRankingItem,
  VisitaCalificacionesService
} from "../../visita-calificaciones/application/visita-calificaciones.service";
import type {
  DashboardDateRangeQueryDto,
  DashboardParcelasPorEtapaQueryDto
} from "../presentation/dto/dashboard-metrics-query.dto";

type VisitasPorMes = {
  mes: string;
  count: number;
};

type VisitasPorCampania = {
  campania: string;
  count: number;
};

type PlagaFrecuente = {
  plaga: string;
  count: number;
};

type DeficienciaNutriente = {
  nutriente: string;
  count: number;
};

const NUTRIENT_NAME_EXPRESSION = `
  NULLIF(
    BTRIM(
      regexp_replace(
        regexp_replace(ve.descripcion, '^Nutricion[[:space:]]*-[[:space:]]*', '', 'i'),
        '[[:space:]]*(:|-)[[:space:]]*.*$',
        ''
      )
    ),
    ''
  )
`;

type VisitaReciente = {
  id: string;
  parcela: string;
  fecha: string;
  agronomo: string;
};

type RecetaReciente = {
  id: string;
  parcela: string;
  fecha: string;
  etapa: string | null;
};

type CampaniaActual = { id: string; nombre: string };

export type DashboardResumenData = {
  kpis: {
    totalVisitas: number;
    visitasEsteMes: number;
    productoresActivos: number;
    recetasEmitidas: number;
    cumplimientoPromedio: number | null;
  };
  charts: {
    visitasPorMes: VisitasPorMes[];
    visitasPorCampania: VisitasPorCampania[];
    plagasFrecuentes: PlagaFrecuente[];
    deficienciasNutrientes: DeficienciaNutriente[];
  };
  actividadReciente: {
    ultimasVisitas: VisitaReciente[];
    ultimasRecetas: RecetaReciente[];
  };
  rankingProductores: {
    general: ProductorRankingItem[];
    campaniaActual: {
      nombre: string | null;
      productores: ProductorRankingItem[];
    };
  };
};

type DashboardVisitaPorAgronomo = {
  agronomistUserId: string;
  agronomistName: string;
  count: number;
};

type DashboardEtapaOption = {
  id: string;
  name: string;
  type: "Etapa" | "Labor";
};

type DashboardParcelaPorEtapa = {
  etapaFenologicaId: string;
  name: string;
  type: "Etapa" | "Labor";
  count: number;
  parcelas: string[];
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly calificacionesService: VisitaCalificacionesService
  ) {}

  async getResumen(year?: number): Promise<DashboardResumenData> {
    const targetYear = year ?? new Date().getFullYear();

    const [kpis, charts, actividadReciente, rankingProductores] = await Promise.all([
      this.getKpis(),
      this.getCharts(targetYear),
      this.getActividadReciente(),
      this.getRankingProductores()
    ]);

    return { kpis, charts, actividadReciente, rankingProductores };
  }

  async getVisitasPorAgronomo(
    query: DashboardDateRangeQueryDto
  ): Promise<{ items: DashboardVisitaPorAgronomo[] }> {
    this.ensureDateRange(query);

    const parameters: Record<string, string> = {};
    const filters = this.buildVisitDateFilters("v", query, parameters);
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("v.agronomo_usuario_id", "agronomistUserId")
      .addSelect(
        "COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', u.nombres, u.apellidos)), ''), u.email, 'Sin agronomo')",
        "agronomistName"
      )
      .addSelect("COUNT(*)", "count")
      .from("visitas_campo", "v")
      .leftJoin("usuarios", "u", "u.id = v.agronomo_usuario_id")
      .where(filters)
      .setParameters(parameters)
      .groupBy("v.agronomo_usuario_id")
      .addGroupBy("u.nombres")
      .addGroupBy("u.apellidos")
      .addGroupBy("u.email")
      .orderBy("count", "DESC")
      .addOrderBy("agronomistName", "ASC")
      .getRawMany<{
        agronomistUserId: string;
        agronomistName: string;
        count: string;
      }>();

    return {
      items: rows.map((row) => ({ ...row, count: Number(row.count) }))
    };
  }

  async getParcelasPorEtapa(
    query: DashboardParcelasPorEtapaQueryDto
  ): Promise<{ etapas: DashboardEtapaOption[]; items: DashboardParcelaPorEtapa[] }> {
    this.ensureDateRange(query);

    const etapas = await this.dataSource
      .createQueryBuilder()
      .select("e.id", "id")
      .addSelect("e.nombre", "name")
      .addSelect("e.tipo", "type")
      .from("etapas_fenologicas", "e")
      .where("e.activo = true")
      .orderBy("e.cultivo_id", "ASC")
      .addOrderBy("e.orden", "ASC", "NULLS LAST")
      .addOrderBy("e.nombre", "ASC")
      .getRawMany<DashboardEtapaOption>();

    const values: string[] = [];
    const filters = ["v.activo = true"];
    if (query.fecha_desde) {
      values.push(query.fecha_desde);
      filters.push(`v.fecha_visita >= $${values.length}`);
    }
    if (query.fecha_hasta) {
      values.push(query.fecha_hasta);
      filters.push(`v.fecha_visita <= $${values.length}`);
    }
    let stageJoinFilter = "";
    if (query.etapa_fenologica_id) {
      values.push(query.etapa_fenologica_id);
      stageJoinFilter = ` AND e.id = $${values.length}`;
    }

    const rows = await this.dataSource.query<
      Array<{
        etapaFenologicaId: string;
        name: string;
        type: "Etapa" | "Labor";
        parcela: string;
      }>
    >(
      `WITH ultimas_visitas AS (
        SELECT DISTINCT ON (v.parcela_id)
          v.parcela_id,
          v.etapa_fenologica_id
        FROM visitas_campo v
        WHERE ${filters.join(" AND ")}
          AND v.etapa_fenologica_id IS NOT NULL
        ORDER BY v.parcela_id, v.fecha_visita DESC, v.id DESC
      )
      SELECT
        e.id AS "etapaFenologicaId",
        e.nombre AS "name",
        e.tipo AS "type",
        CASE
          WHEN p.nombre IS NULL OR BTRIM(p.nombre) = '' THEN p.codigo
          ELSE p.codigo || ' - ' || p.nombre
        END AS "parcela"
      FROM ultimas_visitas uv
      INNER JOIN etapas_fenologicas e ON e.id = uv.etapa_fenologica_id AND e.activo = true${stageJoinFilter}
      INNER JOIN parcelas p ON p.id = uv.parcela_id
      ORDER BY e.orden ASC NULLS LAST, e.nombre ASC, "parcela" ASC`,
      values
    );

    const grouped = new Map<string, DashboardParcelaPorEtapa>();
    for (const row of rows) {
      const current = grouped.get(row.etapaFenologicaId);
      if (current) {
        current.parcelas.push(row.parcela);
        current.count += 1;
        continue;
      }

      grouped.set(row.etapaFenologicaId, {
        etapaFenologicaId: row.etapaFenologicaId,
        name: row.name,
        type: row.type,
        count: 1,
        parcelas: [row.parcela]
      });
    }

    return { etapas, items: [...grouped.values()] };
  }

  private async getKpis() {
    const [
      totalVisitas,
      visitasEsteMes,
      productoresActivos,
      recetasEmitidas,
      cumplimientoPromedio
    ] = await Promise.all([
      this.dataSource
        .createQueryBuilder()
        .select("COUNT(*)", "count")
        .from("visitas_campo", "v")
        .where("v.activo = true")
        .getRawOne<{ count: string }>()
        .then((r) => Number(r?.count ?? 0)),

      this.dataSource
        .createQueryBuilder()
        .select("COUNT(*)", "count")
        .from("visitas_campo", "v")
        .where("v.activo = true")
        .andWhere("v.fecha_visita >= date_trunc('month', CURRENT_DATE)")
        .getRawOne<{ count: string }>()
        .then((r) => Number(r?.count ?? 0)),

      this.dataSource
        .createQueryBuilder()
        .select("COUNT(*)", "count")
        .from("productores", "p")
        .where("p.activo = true")
        .getRawOne<{ count: string }>()
        .then((r) => Number(r?.count ?? 0)),

      this.dataSource
        .createQueryBuilder()
        .select("COUNT(*)", "count")
        .from("visita_recetas", "vr")
        .getRawOne<{ count: string }>()
        .then((r) => Number(r?.count ?? 0)),

      this.dataSource
        .createQueryBuilder()
        .select("ROUND(AVG(vc.puntaje::numeric / 3 * 100), 0)", "score")
        .from("visita_calificaciones", "vc")
        .getRawOne<{ score: string | null }>()
        .then((r) =>
          r?.score === null || r?.score === undefined ? null : Number(r.score)
        )
    ]);

    return {
      totalVisitas,
      visitasEsteMes,
      productoresActivos,
      recetasEmitidas,
      cumplimientoPromedio
    };
  }

  private ensureDateRange(query: DashboardDateRangeQueryDto) {
    if (query.fecha_desde && query.fecha_hasta && query.fecha_desde > query.fecha_hasta) {
      throw new BadRequestException(
        "fecha_hasta must be greater than or equal to fecha_desde."
      );
    }
  }

  private buildVisitDateFilters(
    alias: string,
    query: DashboardDateRangeQueryDto,
    parameters: Record<string, string>
  ) {
    const filters = [`${alias}.activo = true`];

    if (query.fecha_desde) {
      filters.push(`${alias}.fecha_visita >= :startDate`);
      parameters.startDate = query.fecha_desde;
    }

    if (query.fecha_hasta) {
      filters.push(`${alias}.fecha_visita <= :endDate`);
      parameters.endDate = query.fecha_hasta;
    }

    return filters;
  }

  private async getCharts(year: number) {
    const [visitasPorMes, visitasPorCampania, plagasFrecuentes, deficienciasNutrientes] =
      await Promise.all([
        this.getVisitasPorMes(year),
        this.getVisitasPorCampania(),
        this.getPlagasFrecuentes(),
        this.getDeficienciasNutrientes()
      ]);

    return {
      visitasPorMes,
      visitasPorCampania,
      plagasFrecuentes,
      deficienciasNutrientes
    };
  }

  private async getVisitasPorMes(year: number): Promise<VisitasPorMes[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("TO_CHAR(v.fecha_visita, 'YYYY-MM')", "mes")
      .addSelect("COUNT(*)", "count")
      .from("visitas_campo", "v")
      .where("v.activo = true")
      .andWhere("EXTRACT(YEAR FROM v.fecha_visita) = :year", { year })
      .groupBy("TO_CHAR(v.fecha_visita, 'YYYY-MM')")
      .orderBy("mes", "ASC")
      .getRawMany<{ mes: string; count: string }>();

    return this.fillMonths(rows, year);
  }

  private fillMonths(
    rows: { mes: string; count: string }[],
    year: number
  ): VisitasPorMes[] {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.mes, Number(row.count));
    }

    const result: VisitasPorMes[] = [];
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      result.push({ mes: key, count: map.get(key) ?? 0 });
    }

    return result;
  }

  private async getVisitasPorCampania(): Promise<VisitasPorCampania[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("c.nombre", "campania")
      .addSelect("COUNT(*)", "count")
      .from("visitas_campo", "v")
      .innerJoin("campanias", "c", "c.id = v.campania_id")
      .where("v.activo = true")
      .groupBy("c.nombre")
      .orderBy("count", "DESC")
      .getRawMany<{ campania: string; count: string }>();

    return rows.map((r) => ({ campania: r.campania, count: Number(r.count) }));
  }

  private async getPlagasFrecuentes(): Promise<PlagaFrecuente[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("pe.nombre", "plaga")
      .addSelect("COUNT(*)", "count")
      .from("visita_observaciones_sanitarias", "vos")
      .innerJoin("plagas_enfermedades", "pe", "pe.id = vos.plaga_enfermedad_id")
      .where("pe.tipo = :tipo", { tipo: "plaga" })
      .groupBy("pe.nombre")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany<{ plaga: string; count: string }>();

    return rows.map((r) => ({ plaga: r.plaga, count: Number(r.count) }));
  }

  private async getDeficienciasNutrientes(): Promise<DeficienciaNutriente[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select(NUTRIENT_NAME_EXPRESSION, "nutriente")
      .addSelect("COUNT(*)", "count")
      .from("visita_evaluaciones", "ve")
      .where("ve.descripcion LIKE :prefix", { prefix: "Nutricion - %" })
      .groupBy(NUTRIENT_NAME_EXPRESSION)
      .orderBy("count", "DESC")
      .limit(3)
      .getRawMany<{ nutriente: string; count: string }>();

    return rows.map((r) => ({
      nutriente: r.nutriente ?? "Sin especificar",
      count: Number(r.count)
    }));
  }

  private async getActividadReciente() {
    const [ultimasVisitas, ultimasRecetas] = await Promise.all([
      this.getUltimasVisitas(),
      this.getUltimasRecetas()
    ]);

    return { ultimasVisitas, ultimasRecetas };
  }

  private async getRankingProductores() {
    const [general, campaignRows] = await Promise.all([
      this.calificacionesService.getProductorRanking(),
      this.dataSource.query(
        `SELECT id, nombre
         FROM campanias
         WHERE activa = true
           AND fecha_inicio <= CURRENT_DATE
           AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
         ORDER BY fecha_inicio DESC, id DESC
         LIMIT 1`
      )
    ]);
    const campania = campaignRows[0] as CampaniaActual | undefined;
    const productores = campania
      ? await this.calificacionesService.getProductorRanking({
          campaniaId: String(campania.id)
        })
      : [];

    return { general, campaniaActual: { nombre: campania?.nombre ?? null, productores } };
  }

  private async getUltimasVisitas(): Promise<VisitaReciente[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("v.id", "id")
      .addSelect("COALESCE(p.nombre, 'Sin parcela')", "parcela")
      .addSelect("TO_CHAR(v.fecha_visita, 'YYYY-MM-DD')", "fecha")
      .addSelect("COALESCE(u.email, 'Sin agronomo')", "agronomo")
      .from("visitas_campo", "v")
      .leftJoin("parcelas", "p", "p.id = v.parcela_id")
      .leftJoin("usuarios", "u", "u.id = v.agronomo_usuario_id")
      .where("v.activo = true")
      .orderBy("v.creado_at", "DESC")
      .limit(5)
      .getRawMany<VisitaReciente>();

    return rows;
  }

  private async getUltimasRecetas(): Promise<RecetaReciente[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("vr.id", "id")
      .addSelect("COALESCE(p.nombre, 'Sin parcela')", "parcela")
      .addSelect("TO_CHAR(vr.creado_at, 'YYYY-MM-DD HH24:MI')", "fecha")
      .addSelect("vr.etapa_fenologica", "etapa")
      .from("visita_recetas", "vr")
      .innerJoin("visitas_campo", "v", "v.id = vr.visita_id")
      .leftJoin("parcelas", "p", "p.id = v.parcela_id")
      .orderBy("vr.creado_at", "DESC")
      .limit(5)
      .getRawMany<RecetaReciente>();

    return rows;
  }
}
