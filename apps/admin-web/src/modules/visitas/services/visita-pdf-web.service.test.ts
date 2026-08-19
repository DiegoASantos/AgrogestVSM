import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildProducerMixtureRows,
  createPrintablePdfWindow,
  openDiagnosticPdf,
  openRecipePdf,
  showPrintablePdfError,
  type PrintablePdfWindow
} from "./visita-pdf-web.service";
import type { VisitaRecetaCompleta } from "../types/visitas.types";

type MockPopup = PrintablePdfWindow & {
  _written: string[];
  _title: string;
  _focused: boolean;
  _printed: boolean;
};

function makeMockPopup(): MockPopup {
  const popup = {
    _written: [] as string[],
    _title: "",
    _focused: false,
    _printed: false,
    document: {
      open: vi.fn(),
      write: vi.fn((html: string) => {
        popup._written.push(html);
      }),
      close: vi.fn(),
      title: ""
    } as unknown as Document,
    focus: vi.fn(() => {
      popup._focused = true;
    }),
    print: vi.fn(() => {
      popup._printed = true;
    })
  } as unknown as MockPopup;

  return popup;
}

function makeDiagnosticDetail(overrides: Record<string, unknown> = {}) {
  const base = {
    visita: {
      id: "v1",
      publicId: "pub-v1",
      visitDate: "2026-06-15",
      startVisitTime: "08:00",
      endVisitTime: "10:30",
      cropId: "c1",
      varietyId: "var1",
      parcelaId: "p1",
      campaignId: "camp1",
      phenologicalStageId: "stage1",
      subEtapaId: null,
      subEtapaPercentage: null,
      plantsCount: 100,
      areaHectares: "2.5",
      sowingDate: "2025-09-01",
      generalObservation: null,
      agronomistUserId: "u1",
      nroFicha: "F-001",
      synchronizedAt: null,
      isActive: true,
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z"
    },
    evaluaciones: [],
    observacionesSanitarias: [],
    riego: null,
    laboresCulturales: [],
    calificaciones: [],
    stepNotes: [],
    technicalScores: null,
    lookups: {
      agronomist: { id: "u1", name: "Carlos Lopez" },
      crop: { id: "c1", name: "Banano", code: "BAN", isActive: true },
      variety: { id: "var1", name: "Criolla", code: "CRI", cultivoId: "c1" },
      parcela: {
        id: "p1",
        productorId: "prod1",
        sectorId: "s1",
        code: "P-001",
        name: "Parcela Norte",
        areaHectares: "5.0"
      },
      productor: {
        id: "prod1",
        entityType: "persona" as const,
        firstName: "Juan",
        lastName: "Perez",
        documentNumber: "12345678",
        publicId: "pub-prod1",
        email: null
      },
      campaign: {
        id: "camp1",
        name: "Campania 2026",
        cultivoId: "c1",
        startDate: "2026-01-01",
        endDate: "2026-12-31"
      },
      phenologicalStage: {
        id: "stage1",
        name: "Floracion",
        cultivoId: "c1",
        description: "Etapa de floracion",
        isActive: true
      },
      subEtapas: [],
      pestDiseases: [],
      incidenceLevels: [],
      tiposRiego: []
    }
  };

  if (overrides.lookups) {
    return {
      ...base,
      ...overrides,
      lookups: { ...base.lookups, ...(overrides.lookups as Record<string, unknown>) }
    };
  }

  return { ...base, ...overrides };
}

function makeConsolidacion() {
  return {
    etapaFenologica: null,
    plagas: [],
    enfermedades: [],
    nutricion: [],
    labores: [],
    riego: { humedadSuelo: "optimo", estresHidrico: false }
  };
}

describe("visitaPdfWebService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      open: vi.fn(),
      setTimeout: vi.fn((fn: () => void) => fn())
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("#createPrintablePdfWindow", () => {
    it("should open a popup and write placeholder HTML", () => {
      const popup = makeMockPopup();
      (window as unknown as { open: ReturnType<typeof vi.fn> }).open = vi.fn(
        () => popup as unknown as Window
      );

      const result = createPrintablePdfWindow();

      expect(result).toBe(popup);
      expect(popup._written.length).toBeGreaterThan(0);
      expect(popup._written[0]).toContain("Preparando reporte");
    });

    it("should throw when popup is blocked", () => {
      (window as unknown as { open: ReturnType<typeof vi.fn> }).open = vi.fn(() => null);

      expect(() => createPrintablePdfWindow()).toThrow("bloqueo");
    });
  });

  describe("#openDiagnosticPdf", () => {
    it("should write diagnostic HTML to popup and trigger print after timeout", () => {
      const popup = makeMockPopup();

      openDiagnosticPdf(makeDiagnosticDetail(), popup);

      expect(popup._written.length).toBeGreaterThan(0);
      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("Ficha de Visita de campo");
      expect(html).toContain("Paso 1 - Datos generales");
      expect(html).toContain("Parcela Norte");
      expect(html).toContain("Floracion");
    });

    it("should include agricultor name in the output", () => {
      const popup = makeMockPopup();

      openDiagnosticPdf(makeDiagnosticDetail(), popup);

      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("Juan Perez");
    });

    it("should handle null productor gracefully", () => {
      const popup = makeMockPopup();

      openDiagnosticPdf(makeDiagnosticDetail({ lookups: { productor: null } }), popup);

      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("Ficha de Visita de campo");
    });

    it("should render all section titles even with empty data", () => {
      const popup = makeMockPopup();

      openDiagnosticPdf(makeDiagnosticDetail(), popup);

      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("Paso 2 - Plagas");
      expect(html).toContain("Paso 3 - Enfermedades");
      expect(html).toContain("Paso 4 - Nutricion");
      expect(html).toContain("Paso 5 - Riego");
      expect(html).toContain("Paso 6 - Labores culturales");
    });
  });

  describe("#openRecipePdf", () => {
    it("should show empty message when receta is null", () => {
      const popup = makeMockPopup();

      openRecipePdf(makeDiagnosticDetail(), null, makeConsolidacion(), [], popup);

      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("Sin receta disponible");
    });

    it("renders the compact producer recipe with ordered mixtures and doses", () => {
      const popup = makeMockPopup();

      openRecipePdf(
        makeDiagnosticDetail(),
        makeRecipe(),
        makeConsolidacion(),
        [
          { id: "ph", name: "Corrector de pH", description: null },
          { id: "adh", name: "Adherente", description: null }
        ],
        popup
      );

      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("Receta de recomendaciones tecnicas");
      expect(html).toContain("Resumen del Diagnostico");
      expect(html).toContain("Mezclas y dosis");
      expect(html).toContain("Productos y coadyuvantes (en orden)");
      expect(html.indexOf("Corrector de pH")).toBeLessThan(html.indexOf("Fungi Max"));
      expect(html.indexOf("Fungi Max")).toBeLessThan(html.indexOf("Urea"));
      expect(html).toContain("50 ml/cilindro");
      expect(html).toContain("100 ml");
      expect(html).toContain('rowspan="4">1</td>');
      expect(html.match(/mixture-plan-number/g)).toHaveLength(2);
      expect(html).not.toContain("Aplicaciones fitosanitarias");
      expect(html).not.toContain("<h2>Fertilizacion</h2>");
      expect(html).not.toContain("Recomendacion de riego");
      expect(html).not.toContain("Recomendacion de labores");
      expect(html).not.toContain("Resumen para el productor");
      expect(html).not.toContain("Cantidad total producto");
    });

    it("keeps the legacy fitosanidad projection readable", () => {
      const receta = makeRecipe();
      receta.mezclas = undefined;
      receta.fertilizacion = [];
      receta.fitosanidad = [
        {
          id: "legacy-product",
          numero: 2,
          objetivo: "plaga",
          objetivoNombre: "Trips",
          tipoControlId: null,
          tipoProductoId: null,
          disolvente: "Agua",
          modoAccionId: null,
          ingredienteActivoNombre: "Spinosad",
          dosisIa: 25,
          unidadDosis: "ml/cilindro",
          volumenAplicacion: null,
          cantidadTotalIa: null,
          marcaProductoNombre: "Spino Max",
          concentracionProducto: null,
          cantidadTotalProducto: null,
          coadyuvantesIds: null,
          ordenMezcla: JSON.stringify(["Agua", "Spino Max"])
        }
      ];

      expect(buildProducerMixtureRows(receta, [])).toEqual([
        { mixtureNumber: 2, order: 1, item: "Spino Max", dose: "25 ml/cilindro" }
      ]);
    });
  });

  describe("#showPrintablePdfError", () => {
    it("should write error message to popup", () => {
      const popup = makeMockPopup();

      showPrintablePdfError(popup, "Error de conexion al servidor");

      const html = popup._written[popup._written.length - 1];
      expect(html).toContain("No se pudo preparar el reporte");
      expect(html).toContain("Error de conexion al servidor");
    });

    it("should escape HTML in error messages", () => {
      const popup = makeMockPopup();

      showPrintablePdfError(popup, "<script>alert('xss')</script>");

      const html = popup._written[popup._written.length - 1];
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });
});

function makeRecipe() {
  return {
    id: "recipe-1",
    visitaId: "v1",
    etapaFenologica: "Floracion",
    version: 1,
    mezclas: [
      {
        id: "mix-1",
        numero: 1,
        coadyuvantesIds: JSON.stringify(["ph", "adh"]),
        coadyuvantesDosis: JSON.stringify({ ph: "20 ml", adh: "100 ml" }),
        ordenMezcla: JSON.stringify([
          "Agua",
          "Corrector de pH",
          "Fungi Max",
          "Urea",
          "Adherente"
        ]),
        productos: [
          {
            id: "product-1",
            objetivo: "enfermedad",
            objetivoNombre: "Oidium",
            ingredienteActivoNombre: "Azoxistrobina",
            dosisProducto: 50,
            unidadDosis: "ml/cilindro",
            marcaProductoNombre: "Fungi Max"
          }
        ]
      }
    ],
    fitosanidad: [],
    fertilizacion: [
      {
        id: "fert-1",
        mezclaNumero: 1,
        fertilizanteNombre: "Urea",
        dosis: 2,
        unidadDosis: "kg/ha"
      }
    ],
    riego: { id: "riego-1", tipoRecomendacion: "riego_ligero" },
    labores: [{ id: "labor-1", labor: "horqueteo" }],
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z"
  } as unknown as VisitaRecetaCompleta;
}
