import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPrintablePdfWindow,
  openDiagnosticPdf,
  openRecipePdf,
  showPrintablePdfError,
  type PrintablePdfWindow
} from "./visita-pdf-web.service";

type MockPopup = PrintablePdfWindow & {
  _written: string[];
  _title: string;
  _focused: boolean;
  _printed: boolean;
};

function makeMockPopup(): MockPopup {
  const popup: MockPopup = {
    _written: [],
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
    focus: vi.fn(() => { popup._focused = true; }),
    print: vi.fn(() => { popup._printed = true; })
  };

  return popup;
}

function makeDiagnosticDetail(overrides: Record<string, unknown> = {}) {
  const base = {
    visita: {
      id: "v1",
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
      nroFicha: "F-001"
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
      variety: { id: "var1", name: "Criolla", cultivoId: "c1" },
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
        firstName: "Juan",
        lastName: "Perez",
        documentNumber: "12345678",
        publicId: "pub-prod1",
        email: null
      },
      campaign: { id: "camp1", name: "Campania 2026" },
      phenologicalStage: { id: "stage1", name: "Floracion", cultivoId: "c1", isActive: true },
      subEtapas: [],
      pestDiseases: [],
      incidenceLevels: [],
      tiposRiego: []
    }
  };

  if (overrides.lookups) {
    return { ...base, ...overrides, lookups: { ...base.lookups, ...(overrides.lookups as Record<string, unknown>) } };
  }

  return { ...base, ...overrides };
}

function makeRecetaData() {
  return {
    id: "r1",
    visitaId: "v1",
    mezclas: [],
    tipoRecomendacion: "preventivo" as const,
    coadyuvantes: [],
    fertilizantes: [],
    fitosanidad: [],
    riego: null,
    laboresCulturales: [],
    observaciones: [],
    productor: {
      id: "prod1",
      firstName: "Juan",
      lastName: "Perez",
      documentNumber: "12345678",
      publicId: "pub-prod1",
      email: null
    },
    resumenProductor: {},
    nombreComercial: "Receta Test"
  };
}

function makeConsolidacion() {
  return {
    hallazgos: [],
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
      (window as unknown as { open: ReturnType<typeof vi.fn> }).open = vi.fn(() => popup as unknown as Window);

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
