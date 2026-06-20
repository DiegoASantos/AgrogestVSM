import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";

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

export type DashboardResumenData = {
  kpis: {
    totalVisitas: number;
    visitasEsteMes: number;
    productoresActivos: number;
    recetasEmitidas: number;
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
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async getResumen(year?: number): Promise<DashboardResumenData> {
    const targetYear = year ?? new Date().getFullYear();

    const [kpis, charts, actividadReciente] = await Promise.all([
      this.getKpis(),
      this.getCharts(targetYear),
      this.getActividadReciente()
    ]);

    return { kpis, charts, actividadReciente };
  }

  private async getKpis() {
    const [
      totalVisitas,
      visitasEsteMes,
      productoresActivos,
      recetasEmitidas
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
        .then((r) => Number(r?.count ?? 0))
    ]);

    return { totalVisitas, visitasEsteMes, productoresActivos, recetasEmitidas };
  }

  private async getCharts(year: number) {
    const [visitasPorMes, visitasPorCampania, plagasFrecuentes, deficienciasNutrientes] =
      await Promise.all([
        this.getVisitasPorMes(year),
        this.getVisitasPorCampania(),
        this.getPlagasFrecuentes(),
        this.getDeficienciasNutrientes()
      ]);

    return { visitasPorMes, visitasPorCampania, plagasFrecuentes, deficienciasNutrientes };
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
      .select("ve.descripcion", "nutriente")
      .addSelect("COUNT(*)", "count")
      .from("visita_evaluaciones", "ve")
      .where("ve.descripcion LIKE :prefix", { prefix: "Nutricion - %" })
      .groupBy("ve.descripcion")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany<{ nutriente: string; count: string }>();

    return rows.map((r) => {
      const parts = r.nutriente.split(" - ");
      return { nutriente: parts[1] ?? r.nutriente, count: Number(r.count) };
    });
  }

  private async getActividadReciente() {
    const [ultimasVisitas, ultimasRecetas] = await Promise.all([
      this.getUltimasVisitas(),
      this.getUltimasRecetas()
    ]);

    return { ultimasVisitas, ultimasRecetas };
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
