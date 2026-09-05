import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  type ProductorRankingItem,
  VisitaCalificacionesService
} from "../../visita-calificaciones/application/visita-calificaciones.service";
import type {
  DashboardDateRangeQueryDto,
  DashboardResumenQueryDto
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

type EnfermedadFrecuente = {
  enfermedad: string;
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
    enfermedadesFrecuentes: EnfermedadFrecuente[];
  };
  availableYears: number[];
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

type DashboardParcelaPorEtapa = {
  etapaFenologicaId: string;
  name: string;
  type: "Etapa" | "Labor";
  count: number;
  productores: string[];
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly calificacionesService: VisitaCalificacionesService
  ) {}

  async getResumen(query: DashboardResumenQueryDto): Promise<DashboardResumenData> {
    const period = this.resolveDashboardPeriod(query);

    const [kpis, charts, actividadReciente, rankingProductores, availableYears] = await Promise.all([
      this.getKpis(),
      this.getCharts(period),
      this.getActividadReciente(),
      this.getRankingProductores(),
      this.getAvailableVisitYears(period.year)
    ]);

    return { kpis, charts, actividadReciente, rankingProductores, availableYears };
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
      .where(filters.join(" AND "))
      .setParameters(parameters)
      .groupBy("v.agronomo_usuario_id")
      .addGroupBy("u.nombres")
      .addGroupBy("u.apellidos")
      .addGroupBy("u.email")
      .orderBy("count", "DESC")
      .addOrderBy('"agronomistName"', "ASC")
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
    query: DashboardDateRangeQueryDto
  ): Promise<{ items: DashboardParcelaPorEtapa[] }> {
    this.ensureDateRange(query);

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
    const rows = await this.dataSource.query<
      Array<{
        etapaFenologicaId: string;
        name: string;
        type: "Etapa" | "Labor";
        productor: string;
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
        COALESCE(
          NULLIF(BTRIM(CONCAT_WS(' ', productor.apellidos, productor.nombres)), ''),
          'Productor sin nombre'
        ) AS "productor"
      FROM ultimas_visitas uv
      INNER JOIN etapas_fenologicas e ON e.id = uv.etapa_fenologica_id AND e.activo = true
      INNER JOIN parcelas p ON p.id = uv.parcela_id
      INNER JOIN productores productor ON productor.id = p.productor_id
      ORDER BY e.orden ASC NULLS LAST, e.nombre ASC, "productor" ASC`,
      values
    );

    const grouped = new Map<string, DashboardParcelaPorEtapa>();
    for (const row of rows) {
      const current = grouped.get(row.etapaFenologicaId);
      if (current) {
        current.productores.push(row.productor);
        current.count += 1;
        continue;
      }

      grouped.set(row.etapaFenologicaId, {
        etapaFenologicaId: row.etapaFenologicaId,
        name: row.name,
        type: row.type,
        count: 1,
        productores: [row.productor]
      });
    }

    return { items: [...grouped.values()] };
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
        .innerJoin("visitas_campo", "v", "v.id = vr.visita_id")
        .where("v.activo = true")
        .getRawOne<{ count: string }>()
        .then((r) => Number(r?.count ?? 0)),

      this.dataSource
        .createQueryBuilder()
        .select("ROUND(AVG(vc.puntaje::numeric / 3 * 100), 0)", "score")
        .from("visita_calificaciones", "vc")
        .innerJoin("visitas_campo", "v", "v.id = vc.visita_id")
        .where("v.activo = true")
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

  private resolveDashboardPeriod(
    query: DashboardResumenQueryDto
  ): Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto {
    const year = query.year ?? new Date().getFullYear();

    if (query.day && !query.month) {
      throw new BadRequestException("day requires month.");
    }

    if (query.month && query.day) {
      const lastDayOfMonth = new Date(year, query.month, 0).getDate();
      if (query.day > lastDayOfMonth) {
        throw new BadRequestException("day is not valid for the selected year and month.");
      }
    }

    return { ...query, year };
  }

  private buildDashboardDateFilters(
    alias: string,
    period: Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto
  ) {
    const filters = [
      `${alias}.activo = true`,
      `EXTRACT(YEAR FROM ${alias}.fecha_visita) = :dashboardYear`
    ];
    const parameters: Record<string, number> = { dashboardYear: period.year };

    if (period.month) {
      filters.push(`EXTRACT(MONTH FROM ${alias}.fecha_visita) = :dashboardMonth`);
      parameters.dashboardMonth = period.month;
    }

    if (period.day) {
      filters.push(`EXTRACT(DAY FROM ${alias}.fecha_visita) = :dashboardDay`);
      parameters.dashboardDay = period.day;
    }

    return { filters, parameters };
  }

  private async getAvailableVisitYears(currentYear: number) {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("DISTINCT EXTRACT(YEAR FROM v.fecha_visita)", "year")
      .from("visitas_campo", "v")
      .where("v.activo = true")
      .orderBy("year", "DESC")
      .getRawMany<{ year: string }>();

    return Array.from(
      new Set([currentYear, ...rows.map((row) => Number(row.year)).filter(Number.isInteger)])
    ).sort((left, right) => right - left);
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

  private async getCharts(period: Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto) {
    const [
      visitasPorMes,
      visitasPorCampania,
      plagasFrecuentes,
      deficienciasNutrientes,
      enfermedadesFrecuentes
    ] = await Promise.all([
        this.getVisitasPorMes(period),
        this.getVisitasPorCampania(),
        this.getPlagasFrecuentes(period),
        this.getDeficienciasNutrientes(period),
        this.getEnfermedadesFrecuentes(period)
      ]);

    return {
      visitasPorMes,
      visitasPorCampania,
      plagasFrecuentes,
      deficienciasNutrientes,
      enfermedadesFrecuentes
    };
  }

  private async getVisitasPorMes(
    period: Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto
  ): Promise<VisitasPorMes[]> {
    const { filters, parameters } = this.buildDashboardDateFilters("v", period);
    const dateFormat = period.month ? "YYYY-MM-DD" : "YYYY-MM";
    const rows = await this.dataSource
      .createQueryBuilder()
      .select(`TO_CHAR(v.fecha_visita, '${dateFormat}')`, "mes")
      .addSelect("COUNT(*)", "count")
      .from("visitas_campo", "v")
      .where(filters.join(" AND "))
      .setParameters(parameters)
      .groupBy(`TO_CHAR(v.fecha_visita, '${dateFormat}')`)
      .orderBy("mes", "ASC")
      .getRawMany<{ mes: string; count: string }>();

    return period.month
      ? this.fillDays(rows, period.year, period.month, period.day)
      : this.fillMonths(rows, period.year);
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
    for (const currentMonth of Array.from({ length: 12 }, (_, index) => index + 1)) {
      const key = `${year}-${String(currentMonth).padStart(2, "0")}`;
      result.push({ mes: key, count: map.get(key) ?? 0 });
    }

    return result;
  }

  private fillDays(
    rows: { mes: string; count: string }[],
    year: number,
    month: number,
    day?: number
  ): VisitasPorMes[] {
    const map = new Map(rows.map((row) => [row.mes, Number(row.count)]));
    const days = day
      ? [day]
      : Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1);

    return days.map((currentDay) => {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
      return { mes: key, count: map.get(key) ?? 0 };
    });
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

  private async getPlagasFrecuentes(
    period: Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto
  ): Promise<PlagaFrecuente[]> {
    const { filters, parameters } = this.buildDashboardDateFilters("v", period);
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("pe.nombre", "plaga")
      .addSelect("COUNT(*)", "count")
      .from("visita_observaciones_sanitarias", "vos")
      .innerJoin("visitas_campo", "v", "v.id = vos.visita_id")
      .innerJoin("plagas_enfermedades", "pe", "pe.id = vos.plaga_enfermedad_id")
      .where(`pe.tipo = :tipo AND ${filters.join(" AND ")}`, {
        ...parameters,
        tipo: "plaga"
      })
      .groupBy("pe.nombre")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany<{ plaga: string; count: string }>();

    return rows.map((r) => ({ plaga: r.plaga, count: Number(r.count) }));
  }

  private async getDeficienciasNutrientes(
    period: Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto
  ): Promise<DeficienciaNutriente[]> {
    const { filters, parameters } = this.buildDashboardDateFilters("v", period);
    const rows = await this.dataSource
      .createQueryBuilder()
      .select(NUTRIENT_NAME_EXPRESSION, "nutriente")
      .addSelect("COUNT(*)", "count")
      .from("visita_evaluaciones", "ve")
      .innerJoin("visitas_campo", "v", "v.id = ve.visita_id")
      .where(`ve.descripcion LIKE :prefix AND ${filters.join(" AND ")}`, {
        ...parameters,
        prefix: "Nutricion - %"
      })
      .groupBy(NUTRIENT_NAME_EXPRESSION)
      .orderBy("count", "DESC")
      .limit(3)
      .getRawMany<{ nutriente: string; count: string }>();

    return rows.map((r) => ({
      nutriente: r.nutriente ?? "Sin especificar",
      count: Number(r.count)
    }));
  }

  private async getEnfermedadesFrecuentes(
    period: Required<Pick<DashboardResumenQueryDto, "year">> & DashboardResumenQueryDto
  ): Promise<EnfermedadFrecuente[]> {
    const { filters, parameters } = this.buildDashboardDateFilters("v", period);
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("pe.nombre", "enfermedad")
      .addSelect("COUNT(*)", "count")
      .from("visita_observaciones_sanitarias", "vos")
      .innerJoin("visitas_campo", "v", "v.id = vos.visita_id")
      .innerJoin("plagas_enfermedades", "pe", "pe.id = vos.plaga_enfermedad_id")
      .where(`pe.tipo = :tipo AND ${filters.join(" AND ")}`, {
        ...parameters,
        tipo: "enfermedad"
      })
      .groupBy("pe.nombre")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany<{ enfermedad: string; count: string }>();

    return rows.map((row) => ({ enfermedad: row.enfermedad, count: Number(row.count) }));
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
      .where("v.activo = true")
      .orderBy("vr.creado_at", "DESC")
      .limit(5)
      .getRawMany<RecetaReciente>();

    return rows;
  }
}
