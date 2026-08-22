import { describe, expect, it, vi } from "vitest";

import { ScoreSanitarioPlagasService } from "./score-sanitario-plagas.service";

function buildQueryBuilder(departmentCode = "15") {
  const query = {
    innerJoin: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
    getRawOne: vi.fn().mockResolvedValue({ code: departmentCode })
  };
  query.innerJoin.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

function buildObservation({
  id,
  name,
  code,
  incidence,
  severity
}: {
  id: string;
  name: string;
  code?: string;
  incidence: number;
  severity: number;
}) {
  return {
    plagaEnfermedadId: id,
    plagaEnfermedad: { type: "plaga", name, code: code ?? null },
    nivelIncidencia: { grade: incidence },
    nivelSeveridad: { grade: severity }
  };
}

function buildService(
  observations: unknown[],
  departmentCode = "15",
  technicalScoreVersion = 1
) {
  const visits = {
    findOne: vi
      .fn()
      .mockResolvedValue({ id: "visit-1", isActive: true, technicalScoreVersion }),
    createQueryBuilder: vi.fn().mockReturnValue(buildQueryBuilder(departmentCode))
  };
  const steps = {
    findOne: vi.fn().mockResolvedValue({ finalizedAt: new Date("2026-07-31T12:00:00Z") })
  };
  const observationRepository = { find: vi.fn().mockResolvedValue(observations) };

  return new ScoreSanitarioPlagasService(
    visits as never,
    steps as never,
    observationRepository as never,
    { findOne: vi.fn().mockResolvedValue(null) } as never
  );
}

describe("ScoreSanitarioPlagasService", () => {
  it("consolida siempre las seis plagas y asigna nota 3 a las no evaluadas", async () => {
    const service = buildService([
      buildObservation({ id: "pest-trips", name: "Trips", incidence: 2, severity: 1 })
    ]);

    const result = await service.resolveVisitScore("visit-1");

    expect(result.score).toBe(1);
    expect(result.percentage).toBe(33.33);
    expect(result.detail?.pestScores).toHaveLength(6);
    expect(result.detail?.pestScores[0]).toMatchObject({
      key: "trips",
      evaluated: true,
      incidenceGrade: 2,
      severityGrade: 1,
      score: 1,
      formula: "3 - MAX(2, 1) = 1"
    });
    expect(result.detail?.pestScores.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "queresas",
          evaluated: false,
          incidenceGrade: 0,
          severityGrade: 0,
          score: 3
        }),
        expect.objectContaining({
          key: "mosca_fruta",
          evaluated: false,
          incidenceGrade: 0,
          severityGrade: 0,
          score: 3
        })
      ])
    );
    expect(result.detail).toMatchObject({
      appliedFormula: "MIN(1, 3, 3, 3, 3, 3) = 1",
      moduleScore: 1,
      semaphore: "amarillo",
      status: "Alerta / Umbral de Intervención"
    });
  });

  it("devuelve score 3 y semáforo verde si ninguna plaga fue registrada", async () => {
    const result = await buildService([]).resolveVisitScore("visit-1");

    expect(result.detail).toMatchObject({
      appliedFormula: "MIN(3, 3, 3, 3, 3, 3) = 3",
      moduleScore: 3,
      modulePercentage: 100,
      semaphore: "verde"
    });
  });

  it("incluye las diez plagas de la versión 2 sin alterar el universo histórico", async () => {
    const result = await buildService(
      [
        buildObservation({
          id: "pest-aranita",
          name: "Arañita roja",
          code: "aranita_roja",
          incidence: 3,
          severity: 2
        })
      ],
      "15",
      2
    ).resolveVisitScore("visit-1");

    expect(result.detail?.pestScores).toHaveLength(10);
    expect(result.detail?.pestScores).toContainEqual(
      expect.objectContaining({ key: "aranita_roja", evaluated: true, score: 0 })
    );
    expect(result.detail?.moduleFormula).toContain("Hormiga arriera");
  });

  it("aplica la regla especial de Mosca de la fruta antes del mínimo", async () => {
    const service = buildService([
      buildObservation({
        id: "pest-fly",
        name: "Mosca de la fruta",
        code: "mosca_fruta",
        incidence: 0,
        severity: 1
      })
    ]);

    const result = await service.resolveVisitScore("visit-1");
    const fly = result.detail?.pestScores.find((item) => item.key === "mosca_fruta");

    expect(fly).toMatchObject({
      score: 0,
      specialRule: "Regla Mosca de la fruta: severidad ≥ 1"
    });
    expect(fly?.formula).toContain("⇒ nota 0");
    expect(result.detail).toMatchObject({
      moduleScore: 0,
      semaphore: "rojo",
      status: "Emergencia en Campo"
    });
  });

  it("no identifica Mosca de la fruta por el nombre si falta su código estable", async () => {
    const service = buildService([
      buildObservation({
        id: "pest-without-stable-code",
        name: "Mosca de la fruta",
        incidence: 3,
        severity: 2
      })
    ]);

    const result = await service.resolveVisitScore("visit-1");
    const fly = result.detail?.pestScores.find((item) => item.key === "mosca_fruta");

    expect(fly).toMatchObject({
      pestDiseaseId: null,
      evaluated: false,
      incidenceGrade: 0,
      severityGrade: 0,
      score: 3,
      specialRule: null
    });
  });

  it("no genera desglose si el paso Plagas no está finalizado", async () => {
    const visits = {
      findOne: vi.fn().mockResolvedValue({ id: "visit-1", isActive: true })
    };
    const steps = { findOne: vi.fn().mockResolvedValue(null) };
    const observations = { find: vi.fn() };
    const service = new ScoreSanitarioPlagasService(
      visits as never,
      steps as never,
      observations as never,
      { findOne: vi.fn().mockResolvedValue(null) } as never
    );

    await expect(service.resolveVisitScore("visit-1")).resolves.toEqual({
      finalized: false,
      score: null,
      percentage: null,
      detail: null
    });
    expect(observations.find).not.toHaveBeenCalled();
  });

  it("consolida con nota 3 sin hallazgos cuando la visita ya tiene receta", async () => {
    const visits = {
      findOne: vi.fn().mockResolvedValue({ id: "visit-1", isActive: true }),
      createQueryBuilder: vi.fn().mockReturnValue(buildQueryBuilder())
    };
    const service = new ScoreSanitarioPlagasService(
      visits as never,
      { findOne: vi.fn().mockResolvedValue(null) } as never,
      { find: vi.fn().mockResolvedValue([]) } as never,
      { findOne: vi.fn().mockResolvedValue({ id: "recipe-1" }) } as never
    );

    await expect(service.resolveVisitScore("visit-1")).resolves.toMatchObject({
      finalized: true,
      score: 3,
      percentage: 100
    });
  });
});
