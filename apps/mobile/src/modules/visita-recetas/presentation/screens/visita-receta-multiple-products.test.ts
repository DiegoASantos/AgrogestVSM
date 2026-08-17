import { describe, expect, it } from "vitest";

import type { RecetaFertilizacion, RecetaMezcla } from "../../types";
import {
  applyFertilizacionApproachFactor,
  appendMezclasForNewFindings,
  buildFertilizacionesForSave,
  buildFertilizacionUnidadDosis,
  buildFitosanidadUnidadDosis,
  buildMezclasForSave,
  calculateTotal,
  createEmptyFertilizacion,
  createPreventiveFitosanidad,
  deriveMezclaFactors,
  diseaseFactorFromPercentage,
  getUnidadDosis,
  getAvailablePreventiveTargets,
  getFertilizacionDosisUnits,
  mergeMissingFitosanidadFindings,
  restoreFitosanidadApps,
  restoreMezclas
} from "./visita-receta-multiple-products";

const now = "2026-08-04T00:00:00.000Z";

const mezcla: RecetaMezcla = {
  id: "mezcla-1",
  serverId: null,
  recetaLocalId: "receta-1",
  numero: 1,
  coadyuvantesIds: '["coad-1"]',
  ordenMezcla: '["Agua","Agrimec"]',
  volumenAplicacion: 2,
  factor: 1.2,
  factorEditable: false,
  cantidadTotalProducto: 600,
  syncStatus: "pending",
  createdAt: now,
  updatedAt: now,
  productos: [
    {
      id: "producto-1",
      serverId: null,
      recetaLocalId: "receta-1",
      mezclaLocalId: "mezcla-1",
      numero: 1,
      objetivo: "plaga",
      objetivoNombre: "Trips",
      enfoque: "reactivo",
      objetivoId: "pest-1",
      incidenciaGrado: 2,
      severidadGrado: null,
      tipoControlId: "1",
      tipoProductoId: "2",
      disolvente: "Agua",
      modoAccionId: "3",
      ingredienteActivoNombre: "Abamectina",
      dosisProducto: 250,
      unidadDosis: "ml/cilindro",
      marcaProductoNombre: "Agrimec",
      concentracionProducto: 18,
      cantidadTotalProducto: 600,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now
    }
  ]
};

describe("receta con mezclas", () => {
  const consolidation = {
    etapaFenologica: "Floracion",
    plagas: [],
    enfermedades: [
      {
        objetivoId: "disease-1",
        nombre: "Oidium",
        incidencia: "10%",
        severidad: "Leve",
        organos: ["flor"],
        incidenceGrade: 2
      }
    ],
    nutricion: [],
    riego: { humedadSuelo: null, estresHidrico: null },
    labores: []
  };

  it("agrega un diagnostico sanitario a una receta guardada sin fitosanidad", () => {
    const merged = mergeMissingFitosanidadFindings([], consolidation);
    const mezclas = appendMezclasForNewFindings([], merged.addedCount);

    expect(merged.addedCount).toBe(1);
    expect(merged.applications[0]).toMatchObject({
      objetivo: "enfermedad",
      objetivoNombre: "Oidium",
      incidenceGrade: 2
    });
    expect(mezclas).toHaveLength(1);
  });

  it("no genera una recomendacion reactiva para hallazgos grado cero", () => {
    const merged = mergeMissingFitosanidadFindings([], {
      ...consolidation,
      enfermedades: [
        {
          ...consolidation.enfermedades[0]!,
          objetivoId: "disease-zero",
          nombre: "Antracnosis",
          incidenceGrade: 0
        }
      ]
    });

    expect(merged).toMatchObject({ addedCount: 0, applications: [] });
  });

  it("ofrece para prevencion solo objetivos sin incidencia positiva ni duplicados", () => {
    const preventive = createPreventiveFitosanidad(
      2,
      "enfermedad",
      "disease-2",
      "Antracnosis"
    );
    const targets = [
      { id: "disease-1", name: "Oidium", type: "enfermedad", isActive: true },
      {
        id: "disease-2",
        name: "Antracnosis",
        type: "enfermedad",
        isActive: true
      },
      {
        id: "disease-3",
        name: "Muerte regresiva",
        type: "enfermedad",
        isActive: true
      },
      { id: "pest-2", name: "Chinche", type: "plaga", isActive: true }
    ].map((item) => ({ ...item, code: null, scientificName: null }));

    expect(
      getAvailablePreventiveTargets(
        targets,
        consolidation,
        [preventive],
        "enfermedad"
      ).map((item) => item.id)
    ).toEqual(["disease-3"]);
  });

  it("guarda una prevencion en grado cero sin elevar el factor de mezcla", () => {
    const preventive = createPreventiveFitosanidad(
      1,
      "plaga",
      "pest-2",
      "Chinche"
    );
    preventive.ingredientes[0]!.mezclaNumero = 1;
    const mezclaPreventiva = { ...restoreMezclas([mezcla])[0]!, factor: "1" };

    expect(deriveMezclaFactors([preventive], [mezclaPreventiva])[0]).toMatchObject({
      factor: "1",
      factorEditable: false
    });
    expect(
      deriveMezclaFactors(
        [...restoreFitosanidadApps([mezcla], [], []), preventive],
        [mezclaPreventiva]
      )[0]
    ).toMatchObject({ factor: "1.2", factorEditable: false });
    expect(buildMezclasForSave([preventive], [mezclaPreventiva])[0]?.productos[0]).toMatchObject({
      enfoque: "preventivo",
      objetivoId: "pest-2",
      incidenciaGrado: 0,
      severidadGrado: 0
    });
  });

  it("conserva recomendaciones existentes y agrega solo el diagnostico faltante", () => {
    const existing = restoreFitosanidadApps([mezcla], [], []);
    const merged = mergeMissingFitosanidadFindings(existing, consolidation);

    expect(merged.addedCount).toBe(1);
    expect(merged.applications[0]).toBe(existing[0]);
    expect(merged.applications.map((item) => item.objetivoNombre)).toEqual([
      "Trips",
      "Oidium"
    ]);
  });

  it("no duplica un diagnostico ya recomendado aunque cambien acentos o mayusculas", () => {
    const existing = [
      {
        ...restoreFitosanidadApps([mezcla], [], [])[0]!,
        objetivo: "enfermedad" as const,
        objetivoNombre: "Oídium"
      }
    ];
    const merged = mergeMissingFitosanidadFindings(existing, consolidation);

    expect(merged.addedCount).toBe(0);
    expect(merged.applications).toHaveLength(1);
    expect(merged.applications[0]).toBe(existing[0]);
  });

  it("restaura cabecera y productos con asignacion estable", () => {
    const apps = restoreFitosanidadApps([mezcla], [], []);
    expect(restoreMezclas([mezcla])[0]).toMatchObject({ numero: 1, factor: "1.2" });
    expect(apps[0]?.ingredientes[0]).toMatchObject({
      mezclaNumero: 1,
      dosisProducto: "250",
      unidadDosis: "ml/cilindro",
      marcaProductoNombre: "Agrimec"
    });
  });

  it("calcula cantidad total con dosis, volumen y factor", () => {
    expect(calculateTotal(250, 2, 1.2)).toBe(600);
    expect(diseaseFactorFromPercentage(15)).toBe(1.2);
  });

  it("guarda mezclas anidadas sin duplicar atributos compartidos", () => {
    const apps = restoreFitosanidadApps([mezcla], [], []);
    const payload = buildMezclasForSave(apps, restoreMezclas([mezcla]));
    expect(payload[0]).toMatchObject({
      numero: 1,
      volumenAplicacion: 2,
      factor: 1.2,
      productos: [
        expect.objectContaining({
          dosisProducto: 250,
          unidadDosis: "ml/cilindro"
        })
      ]
    });
  });

  it("usa el mayor grado de los productos asignados", () => {
    const apps = restoreFitosanidadApps([mezcla], [], []);
    apps.push({
      ...apps[0]!,
      localId: "app-2",
      incidenceGrade: 3,
      ingredientes: [{ ...apps[0]!.ingredientes[0]!, localId: "p-2" }]
    });
    expect(deriveMezclaFactors(apps, restoreMezclas([mezcla]))[0]).toMatchObject({
      factor: "1.5",
      factorEditable: true
    });
  });

  it.each([
    ["edafica", "kg/planta"],
    ["foliar", "kg/cilindro"]
  ] as const)("mantiene la unidad seleccionada para via %s", (via, expected) => {
    expect(
      getUnidadDosis({
        ...createEmptyFertilizacion(),
        viaAplicacion: via,
        tipoProducto: "solido",
        unidadDosis: "kg/cilindro"
      })
    ).toBe(expected);
  });

  it("ofrece unidades por estado fisico sin convertir la dosis", () => {
    expect(getFertilizacionDosisUnits("solido")).toEqual(["mg", "g", "kg"]);
    expect(getFertilizacionDosisUnits("liquido")).toEqual(["ml", "l"]);
    expect(buildFitosanidadUnidadDosis("g")).toBe("g/cilindro");
    expect(buildFertilizacionUnidadDosis("ml", "edafica")).toBe("ml/planta");
    expect(calculateTotal(2, 3, 1.2)).toBeCloseTo(7.2);
  });

  it("incluye factor en fertilizacion", () => {
    const row: RecetaFertilizacion = {
      id: "f-1",
      serverId: null,
      recetaLocalId: "r-1",
      viaAplicacion: "foliar",
      fertilizanteNombre: "Nitrato",
      tipoProducto: "solido",
      dosis: 0.5,
      unidadDosis: "Kg/cilindro",
      cantidadTotalPlantas: null,
      volumenAplicacion: 3,
      factor: 1.2,
      cantidadTotalFertilizante: 1.8,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now
    };
    const app = {
      ...createEmptyFertilizacion(),
      viaAplicacion: row.viaAplicacion,
      fertilizanteNombre: row.fertilizanteNombre ?? "",
      tipoProducto: row.tipoProducto ?? "solido",
      dosis: String(row.dosis),
      unidadDosis: row.unidadDosis ?? "",
      volumenAplicacion: String(row.volumenAplicacion),
      factor: "1.2",
      cantidadTotalFertilizante: String(row.cantidadTotalFertilizante)
    };
    expect(buildFertilizacionesForSave([app])[0]).toMatchObject({ factor: 1.2 });
  });

  it("cambia solo el factor del fertilizante cuyo enfoque se edita", () => {
    const manualReactive = {
      ...createEmptyFertilizacion(),
      enfoque: "reactivo" as const,
      factor: "2.25",
      factorEditable: true
    };
    const changedToPreventive = {
      ...createEmptyFertilizacion(),
      enfoque: "preventivo" as const,
      factor: "1.2"
    };

    const result = applyFertilizacionApproachFactor(
      [manualReactive, changedToPreventive],
      1,
      [3, 2]
    );

    expect(result[0]).toEqual(manualReactive);
    expect(result[1]).toMatchObject({
      enfoque: "preventivo",
      factor: "1",
      factorEditable: false
    });
  });
});
