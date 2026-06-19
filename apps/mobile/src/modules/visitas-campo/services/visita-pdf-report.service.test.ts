import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitaEvaluacion } from "../../evaluaciones/types";
import type { VisitaLaborCultural } from "../../labores-culturales-visita/types";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseByStageItem,
  VisitaObservacionSanitaria,
  VisitaStepNote
} from "../../observaciones-sanitarias/types";
import type { Parcela } from "../../parcelas/types";
import type { Productor } from "../../productores/types";
import type { TipoRiegoCatalogItem, VisitaRiego } from "../../riegos/types";
import type {
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  SubEtapaCatalogItem,
  VariedadCatalogItem,
  VisitaCampo,
  VisitaCampoFull
} from "../types";

const mocks = vi.hoisted(() => ({
  printAsync: vi.fn(),
  printToFileAsync: vi.fn(),
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
  assetFromModule: vi.fn(),
  readAsStringAsync: vi.fn(),
  getFullDetail: vi.fn(),
  getParcelaById: vi.fn(),
  getProductorById: vi.fn(),
  getCultivos: vi.fn(),
  getVariedadesByCultivo: vi.fn(),
  getEtapasFenologicasByCultivo: vi.fn(),
  getSubEtapasByEtapaFenologica: vi.fn(),
  getPestDiseasesByPhenologicalStage: vi.fn(),
  getIncidenceLevels: vi.fn(),
  getTiposRiego: vi.fn(),
  getLaboresCulturales: vi.fn()
}));

vi.mock("expo-print", () => ({
  printAsync: mocks.printAsync,
  printToFileAsync: mocks.printToFileAsync
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: mocks.isAvailableAsync,
  shareAsync: mocks.shareAsync
}));

vi.mock("expo-asset", () => ({
  Asset: {
    fromModule: mocks.assetFromModule
  }
}));

vi.mock("expo-file-system/legacy", () => ({
  default: {
    EncodingType: {
      Base64: "base64"
    },
    readAsStringAsync: mocks.readAsStringAsync
  },
  EncodingType: {
    Base64: "base64"
  },
  readAsStringAsync: mocks.readAsStringAsync
}));

vi.mock("./visitas-campo.service", () => ({
  visitasCampoService: {
    getFullDetail: mocks.getFullDetail
  }
}));

vi.mock("../repositories/visitas-campo.repository", () => ({
  visitasCampoRepository: {
    getCultivos: mocks.getCultivos,
    getVariedadesByCultivo: mocks.getVariedadesByCultivo,
    getEtapasFenologicasByCultivo: mocks.getEtapasFenologicasByCultivo,
    getSubEtapasByEtapaFenologica: mocks.getSubEtapasByEtapaFenologica
  }
}));

vi.mock("../../parcelas/repositories/parcelas.repository", () => ({
  parcelasRepository: {
    getById: mocks.getParcelaById
  }
}));

vi.mock("../../productores/repositories/productores.repository", () => ({
  productoresRepository: {
    getById: mocks.getProductorById
  }
}));

vi.mock(
  "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository",
  () => ({
    observacionesSanitariasRepository: {
      getPestDiseasesByPhenologicalStage: mocks.getPestDiseasesByPhenologicalStage,
      getIncidenceLevels: mocks.getIncidenceLevels
    }
  })
);

vi.mock("../../riegos/repositories/riegos.repository", () => ({
  riegosRepository: {
    getTiposRiego: mocks.getTiposRiego
  }
}));

vi.mock(
  "../../labores-culturales-visita/repositories/labores-culturales-visita.repository",
  () => ({
    laboresCulturalesVisitaRepository: {
      getLaboresCulturales: mocks.getLaboresCulturales
    }
  })
);

const now = "2026-06-17T12:00:00.000Z";

function buildVisit(overrides: Partial<VisitaCampo> = {}): VisitaCampo {
  return {
    id: "visita-1",
    serverId: "server-visita-1",
    syncStatus: "synced",
    publicId: "VIS-2026-001",
    nroFicha: "001",
    cropId: "crop-mango",
    varietyId: "var-kent",
    parcelaId: "parcela-1",
    campaignId: "campania-2026",
    agronomistUserId: "agro-1",
    plantsCount: 150,
    areaHectares: "2.5",
    sowingDate: "2026-01-10",
    visitDate: "2026-06-17",
    startVisitTime: "08:30",
    endVisitTime: "10:15",
    phenologicalStageId: "etapa-floracion",
    subEtapaId: "sub-cuajado",
    subEtapaPercentage: 50,
    generalObservation: "Presencia <alta> & revisar",
    agronomistSignatureName: null,
    producerSignatureName: null,
    visitLocation: null,
    synchronizedAt: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildDetail(overrides: Partial<VisitaCampoFull> = {}): VisitaCampoFull {
  return {
    visita: buildVisit(),
    evaluaciones: [
      buildEvaluation({
        order: 1,
        description: "Deficiencia de nitrogeno",
        percentage: "25"
      })
    ],
    observacionesSanitarias: [
      buildSanitaryObservation({
        pestDiseaseId: "pest-trips",
        incidenceLevelId: "inc-baja",
        severityLevelId: "sev-alta",
        observation: "Se observa dano en brotes",
        organosAfectados: ["tronco_rama", "panicula_floral", "fruto_recien_cuajado"]
      })
    ],
    riego: buildRiego(),
    laboresCulturales: [buildLabor()],
    stepNotes: [
      buildStepNote({ stepNumber: 1, observation: "Productor confirma manejo regular" }),
      buildStepNote({ stepNumber: 2, observation: "Monitorear focos activos" }),
      buildStepNote({ stepNumber: 3, observation: "Reforzar plan nutricional" }),
      buildStepNote({ stepNumber: 4, observation: "Riego suficiente" }),
      buildStepNote({ stepNumber: 5, observation: "Programar poda sanitaria" })
    ],
    ...overrides
  };
}

function buildEvaluation(overrides: Partial<VisitaEvaluacion> = {}): VisitaEvaluacion {
  return {
    id: "eval-1",
    serverId: "server-eval-1",
    syncStatus: "synced",
    visitaId: "visita-1",
    order: 1,
    percentage: "25",
    description: "Deficiencia",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildSanitaryObservation(
  overrides: Partial<VisitaObservacionSanitaria> = {}
): VisitaObservacionSanitaria {
  return {
    id: "obs-1",
    serverId: "server-obs-1",
    syncStatus: "synced",
    visitaId: "visita-1",
    pestDiseaseId: "pest-trips",
    incidenceLevelId: "inc-baja",
    severityLevelId: "sev-alta",
    observation: "Observacion sanitaria",
    organosAfectados: ["hoja_tierna"],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildRiego(overrides: Partial<VisitaRiego> = {}): VisitaRiego {
  return {
    id: "riego-1",
    serverId: "server-riego-1",
    syncStatus: "synced",
    visitaId: "visita-1",
    tipoRiegoId: "riego-goteo",
    fuenteAgua: null,
    tipoSuelo: null,
    humedadSuelo: null,
    estresHidrico: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildLabor(overrides: Partial<VisitaLaborCultural> = {}): VisitaLaborCultural {
  return {
    id: "labor-visita-1",
    serverId: "server-labor-1",
    syncStatus: "synced",
    visitaId: "visita-1",
    laborCulturalId: "labor-poda",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildStepNote(overrides: Partial<VisitaStepNote> = {}): VisitaStepNote {
  return {
    id: `step-${overrides.stepNumber ?? 1}`,
    serverId: null,
    syncStatus: "pending",
    visitaId: "visita-1",
    stepNumber: 1,
    observation: null,
    recommendation: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildParcela(overrides: Partial<Parcela> = {}): Parcela {
  return {
    id: "parcela-1",
    publicId: "PAR-001",
    productorId: "productor-1",
    sectorId: "sector-1",
    code: "P-001",
    name: "Parcela Norte",
    areaHectares: "3.25",
    description: null,
    referencePoint: null,
    geometry: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function buildProductor(overrides: Partial<Productor> = {}): Productor {
  return {
    id: "productor-1",
    publicId: "PROD-001",
    documentTypeId: 1,
    documentNumber: "12345678",
    firstName: "Rosa",
    lastName: "Perez",
    phone: null,
    email: null,
    address: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function getPreviewHtml() {
  const [{ html }] = mocks.printAsync.mock.calls.at(-1) ?? [];
  return String(html);
}

function getSharedHtml() {
  const [{ html }] = mocks.printToFileAsync.mock.calls.at(-1) ?? [];
  return String(html);
}

describe("visitaPdfReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.printToFileAsync.mockResolvedValue({ uri: "file:///tmp/ficha-visita.pdf" });
    mocks.isAvailableAsync.mockResolvedValue(true);
    mocks.assetFromModule.mockReturnValue({
      localUri: "file:///assets/adaptive_icon_vsm.png",
      uri: null,
      downloadAsync: vi.fn().mockResolvedValue(undefined)
    });
    mocks.readAsStringAsync.mockResolvedValue("base64-logo");

    mocks.getFullDetail.mockResolvedValue(buildDetail());
    mocks.getParcelaById.mockReturnValue(buildParcela());
    mocks.getProductorById.mockReturnValue(buildProductor());
    mocks.getCultivos.mockReturnValue([
      {
        id: "crop-mango",
        code: "MANGO",
        name: "Mango",
        isActive: true
      } satisfies CultivoCatalogItem
    ]);
    mocks.getVariedadesByCultivo.mockReturnValue([
      {
        id: "var-kent",
        cultivoId: "crop-mango",
        code: "KENT",
        name: "Kent",
        isActive: true
      } satisfies VariedadCatalogItem
    ]);
    mocks.getEtapasFenologicasByCultivo.mockReturnValue([
      {
        id: "etapa-floracion",
        cultivoId: "crop-mango",
        name: "Floracion",
        description: null,
        sortOrder: 1,
        type: "Etapa",
        isActive: true
      } satisfies EtapaFenologicaCatalogItem
    ]);
    mocks.getSubEtapasByEtapaFenologica.mockReturnValue([
      {
        id: "sub-cuajado",
        etapaFenologicaId: "etapa-floracion",
        name: "Cuajado inicial",
        sortOrder: 1,
        description: null,
        percentage: 50,
        isActive: true
      } satisfies SubEtapaCatalogItem
    ]);
    mocks.getPestDiseasesByPhenologicalStage.mockReturnValue([
      {
        id: "pest-trips",
        scientificName: null,
        name: "Trips",
        type: "Plaga",
        isActive: true,
        stageLevels: [
          {
            id: "rel-inc-baja",
            plagaEnfermedadId: "pest-trips",
            etapaFenologicaId: "etapa-floracion",
            nivelIncidenciaSeveridadId: "inc-baja",
            description: "1 a 5 brotes afectados",
            isActive: true
          },
          {
            id: "rel-sev-alta",
            plagaEnfermedadId: "pest-trips",
            etapaFenologicaId: "etapa-floracion",
            nivelIncidenciaSeveridadId: "sev-alta",
            description: "Dano visible en organos jovenes",
            isActive: true
          }
        ]
      } satisfies PestDiseaseByStageItem
    ]);
    mocks.getIncidenceLevels.mockReturnValue([
      {
        id: "inc-baja",
        name: "Baja",
        sortOrder: 1,
        type: "incidencia"
      },
      {
        id: "sev-alta",
        name: "Alta",
        sortOrder: 3,
        type: "severidad"
      }
    ] satisfies IncidenceLevelCatalogItem[]);
    mocks.getTiposRiego.mockReturnValue([
      {
        id: "riego-goteo",
        name: "Goteo",
        description: "Riego por goteo",
        isActive: true
      } satisfies TipoRiegoCatalogItem
    ]);
    mocks.getLaboresCulturales.mockReturnValue([
      {
        id: "labor-poda",
        name: "Poda sanitaria",
        description: "Retiro de material afectado",
        isActive: true
      }
    ]);
  });

  it("generates a complete visit report preview with real visit sections and escaped content", async () => {
    const { visitaPdfReportService } = await import("./visita-pdf-report.service");

    await visitaPdfReportService.preview("visita-1");

    expect(mocks.getFullDetail).toHaveBeenCalledWith("visita-1");
    expect(mocks.printAsync).toHaveBeenCalledTimes(1);

    const html = getPreviewHtml();

    expect(html).toContain("Ficha de Visita de campo");
    expect(html).toContain("Reporte generado por Agrogest VSM");
    expect(html).toContain("Visita Rosa 17/06/2026");
    expect(html).toContain("Paso 1 - Datos generales");
    expect(html).toContain("Rosa Perez");
    expect(html).toContain("Parcela Norte");
    expect(html).toContain("3.25 ha");
    expect(html).toContain("08:30 - 10:15");
    expect(html).toContain("Mango");
    expect(html).toContain("Kent");
    expect(html).toContain("Floracion");
    expect(html).toContain("Cuajado inicial");
    expect(html).toContain("Presencia &lt;alta&gt; &amp; revisar");

    expect(html).toContain("Paso 2 - Plagas y enfermedades");
    expect(html).toContain("Trips");
    expect(html).toContain("Incidencia Baja: 1 a 5 brotes afectados");
    expect(html).toContain("Severidad Alta: Dano visible en organos jovenes");
    expect(html).toContain("Organos: Tronco/rama, Panícula floral, Fruto recién cuajado");
    expect(html).toContain("Se observa dano en brotes");

    expect(html).toContain("Paso 3 - Nutricion");
    expect(html).toContain("Deficiencia de nitrogeno");
    expect(html).toContain("25%");
    expect(html).toContain("Paso 4 - Riego");
    expect(html).toContain("Goteo");
    expect(html).toContain("Paso 5 - Labores culturales");
    expect(html).toContain("Poda sanitaria");
    expect(html).toContain("Retiro de material afectado");
    expect(html).toContain("Monitorear focos activos");
    expect(html).toContain("Programar poda sanitaria");
  });

  it("shares the generated report as a PDF file when sharing is available", async () => {
    const { visitaPdfReportService } = await import("./visita-pdf-report.service");

    await visitaPdfReportService.share("visita-1");

    expect(mocks.isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(mocks.printToFileAsync).toHaveBeenCalledTimes(1);
    expect(getSharedHtml()).toContain("Ficha de Visita de campo");
    expect(mocks.shareAsync).toHaveBeenCalledWith("file:///tmp/ficha-visita.pdf", {
      dialogTitle: "Compartir ficha de visita",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf"
    });
  });

  it("does not generate a PDF when the device cannot share files", async () => {
    mocks.isAvailableAsync.mockResolvedValue(false);
    const { visitaPdfReportService } = await import("./visita-pdf-report.service");

    await expect(visitaPdfReportService.share("visita-1")).rejects.toThrow(
      "El dispositivo no permite compartir archivos en este momento."
    );

    expect(mocks.printToFileAsync).not.toHaveBeenCalled();
    expect(mocks.shareAsync).not.toHaveBeenCalled();
  });

  it("renders empty report states without crashing when optional visit data is missing", async () => {
    mocks.getFullDetail.mockResolvedValue(
      buildDetail({
        visita: buildVisit({
          plantsCount: null,
          areaHectares: null,
          endVisitTime: null,
          phenologicalStageId: null,
          subEtapaId: null,
          subEtapaPercentage: null,
          generalObservation: null
        }),
        evaluaciones: [],
        observacionesSanitarias: [],
        riego: null,
        laboresCulturales: [],
        stepNotes: []
      })
    );
    mocks.getPestDiseasesByPhenologicalStage.mockReturnValue([]);
    const { visitaPdfReportService } = await import("./visita-pdf-report.service");

    await visitaPdfReportService.preview("visita-1");

    const html = getPreviewHtml();

    expect(html).toContain("No hay plagas o enfermedades registradas.");
    expect(html).toContain("No hay datos de nutricion registrados.");
    expect(html).toContain("No registrado");
    expect(html).toContain("No hay labores culturales registradas.");
  });
});
