import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitaPasoObservacionEntity } from "../infrastructure/persistence/entities/visita-paso-observacion.entity";

type ModuleScore = { finalized: boolean; score: number | null; percentage: number | null };

@Injectable()
export class ScoreSanitarioPlagasService {
  constructor(
    @InjectRepository(VisitaCampoEntity) private readonly visits: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaPasoObservacionEntity) private readonly steps: Repository<VisitaPasoObservacionEntity>,
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observations: Repository<VisitaObservacionSanitariaEntity>
  ) {}

  async byVisit(visitaId: string) {
    const result = await this.resolveVisitScore(visitaId);
    return createSuccessResponse({
      visitaId,
      pasoPlagasFinalizado: result.finalized,
      scoreModuloPlagas: result.score,
      porcentajePlagas: result.percentage
    });
  }

  async byProductor(productorId: string, campaniaId?: string) {
    const query = this.visits
      .createQueryBuilder("visita")
      .innerJoin("parcelas", "parcela", "parcela.id = visita.parcela_id")
      .where("parcela.productor_id = :productorId", { productorId })
      .andWhere("visita.activo = true");
    if (campaniaId) query.andWhere("visita.campania_id = :campaniaId", { campaniaId });
    const visits = await query.getMany();
    const scores = (await Promise.all(visits.map((visit) => this.resolveVisitScore(visit.id))))
      .map((item) => item.percentage)
      .filter((item): item is number => item !== null);
    const average = scores.length ? roundHalfUp(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
    return createSuccessResponse({
      productorId,
      campaniaId: campaniaId ?? null,
      scoreSanitarioProductor: campaniaId ? null : average,
      scoreSanitarioCampania: campaniaId ? average : null,
      visitasElegibles: scores.length
    });
  }

  private async resolveVisitScore(visitaId: string): Promise<ModuleScore> {
    const visit = await this.visits.findOne({ where: { id: visitaId } });
    if (!visit) throw new NotFoundException("Visita de campo no encontrada.");
    if (!visit.isActive) return { finalized: false, score: null, percentage: null };
    const step = await this.steps.findOne({ where: { visitaId, stepNumber: 2 } });
    if (!step?.finalizedAt) return { finalized: false, score: null, percentage: null };
    const department = await this.visits.createQueryBuilder("v")
      .innerJoin("parcelas", "p", "p.id = v.parcela_id")
      .innerJoin("subsectores", "ss", "ss.id = p.subsector_id")
      .innerJoin("sectores", "s", "s.id = ss.sector_id")
      .innerJoin("distritos", "d", "d.id = s.distrito_id")
      .innerJoin("provincias", "pr", "pr.id = d.provincia_id")
      .innerJoin("departamentos", "de", "de.id = pr.departamento_id")
      .select("de.codigo", "code").where("v.id = :visitaId", { visitaId }).getRawOne<{ code: string }>();
    const rows = await this.observations.find({
      where: { visitaId },
      relations: { plagaEnfermedad: true, nivelIncidencia: true, nivelSeveridad: true }
    });
    const scores = rows.filter((row) => row.plagaEnfermedad.type === "plaga").map((row) => {
      const incidence = row.nivelIncidencia?.grade ?? 0;
      const severity = row.nivelSeveridad?.grade ?? 0;
      const code = row.plagaEnfermedad.code;
      if (code === "mosca_fruta" && severity >= 1) return 0;
      if (code === "mosca_fruta" && ((department?.code === "14" && incidence === 3) || (department?.code === "20" && incidence >= 2))) return 0;
      return 3 - Math.max(incidence, severity);
    });
    const score = scores.length ? Math.min(...scores) : 3;
    return { finalized: true, score, percentage: roundHalfUp((score / 3) * 100) };
  }
}

function roundHalfUp(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
