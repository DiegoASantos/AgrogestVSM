import { visitaRecetasService } from "./visita-recetas.service";
import type { VisitaRecetaCompleta } from "../types";
import { parcelasRepository } from "../../parcelas/repositories/parcelas.repository";
import { productoresRepository } from "../../productores/repositories/productores.repository";
import { visitasCampoRepository } from "../../visitas-campo/repositories/visitas-campo.repository";
import { REPORT_IMAGE_WIDTH } from "../../../shared/reporting/report-config";
import { renderProducerMixturePlan } from "./producer-recipe-mixture-plan";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

async function loadPdfNativeModules() {
  try {
    const [Print, Sharing] = await Promise.all([
      import("expo-print"),
      import("expo-sharing")
    ]);

    return { Print, Sharing };
  } catch {
    throw new Error(
      "No se pudieron cargar los modulos nativos de PDF. Asegurate de que la app este compilada correctamente."
    );
  }
}

export const visitaRecetaPdfReportService = {
  buildHtml(visitaId: string) {
    return buildRecetaReportHtml(visitaId);
  },

  async preview(visitaId: string) {
    const { Print } = await loadPdfNativeModules();
    const html = await buildRecetaReportHtml(visitaId);

    await Print.printAsync({ html });
  },

  async share(visitaId: string) {
    const { Print, Sharing } = await loadPdfNativeModules();
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      throw new Error("El dispositivo no permite compartir archivos en este momento.");
    }

    const html = await buildRecetaReportHtml(visitaId);
    const pdf = await Print.printToFileAsync({ html });

    await Sharing.shareAsync(pdf.uri, {
      dialogTitle: "Compartir receta de visita",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf"
    });
  }
};

async function buildRecetaReportHtml(visitaId: string): Promise<string> {
  const receta = visitaRecetasService.getByVisitaId(visitaId);

  if (!receta) {
    return `<html><body style="font-family: sans-serif; padding: 40px; color: #555;">
      <h2>Sin receta disponible</h2>
      <p>No se ha generado una receta para esta visita todavia.</p>
    </body></html>`;
  }

  const visita = visitasCampoRepository.getById(visitaId);
  const parcela = visita ? parcelasRepository.getById(visita.parcelaId) : null;
  const productor = parcela ? productoresRepository.getById(parcela.productorId) : null;
  const productorNombre = construirNombreProductor(productor);
  const consolidacion = visitaRecetasService.getConsolidacionLocal(visitaId);
  const coadyuvantes = visitaRecetasService.getCatalogos().coadyuvantes;
  const iconBase64 = await getReportIconUri();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta content="width=${REPORT_IMAGE_WIDTH}, initial-scale=1.0" name="viewport">
  <title>Receta de Visita</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #1a1f1c;
      line-height: 1.5;
      padding: 28px 32px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #2d6a4f;
    }
    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      object-fit: contain;
    }
    .header-text h1 {
      font-size: 22px;
      color: #1b4332;
      font-weight: 700;
    }
    .header-text p {
      font-size: 12px;
      color: #6b7a6f;
      margin-top: 2px;
    }
    .header-text .productor {
      font-size: 15px;
      color: #1b4332;
      font-weight: 700;
      margin-top: 4px;
    }
    h2 {
      font-size: 16px;
      color: #2d6a4f;
      margin: 18px 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #e8efe9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 12px 0;
      font-size: 11px;
    }
    th, td {
      padding: 5px 8px;
      text-align: left;
      border: 1px solid #d0ddd4;
    }
    th {
      background: #eaf3dc;
      color: #1b4332;
      font-weight: 600;
    }
    .mixture-plan-table tr {
      break-inside: avoid;
    }
    .mixture-plan-number {
      width: 12%;
      text-align: center;
      font-weight: 700;
      color: #1b4332;
    }
    .mixture-plan-item {
      width: 58%;
    }
    .mixture-plan-dose {
      width: 30%;
      white-space: nowrap;
    }
    .field-row {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .field-label {
      color: #6b7a6f;
      min-width: 140px;
      font-weight: 600;
    }
    .field-value {
      color: #1a1f1c;
    }
    .visit-data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .visit-summary {
      background: #f7fbf8;
      border: 1px solid #d0ddd4;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 12px;
    }
    .visit-data-card {
      background: #fafcfa;
      border: 1px solid #e8efe9;
      border-radius: 8px;
      padding: 9px 10px;
      break-inside: avoid;
    }
    .visit-data-title {
      color: #1b4332;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 5px;
      padding-left: 6px;
      border-left: 3px solid #74c69d;
    }
    .compact-list {
      margin: 0;
      padding-left: 14px;
      font-size: 10.5px;
    }
    .compact-list li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${iconBase64 ? `<img alt="AgroGest VSM" class="header-icon" src="${iconBase64}" />` : ""}
    <div class="header-text">
      <h1>Receta de recomendaciones tecnicas</h1>
      <p class="productor">Productor: ${productorNombre}</p>
      <p>AgroGest VSM - ${new Date().toLocaleDateString("es-PE")}</p>
    </div>
  </div>
  ${renderDatosVisita(visita, receta, consolidacion)}
  ${renderProducerMixturePlan(receta, coadyuvantes)}
</body>
</html>`;
}

function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function renderDatosVisita(
  visita: ReturnType<typeof visitasCampoRepository.getById>,
  receta: VisitaRecetaCompleta,
  consolidacion: ReturnType<typeof visitaRecetasService.getConsolidacionLocal>
): string {
  const etapas = visita?.cropId
    ? visitasCampoRepository.getEtapasFenologicasByCultivo(visita.cropId)
    : [];
  const subEtapas = visita?.phenologicalStageId
    ? visitasCampoRepository.getSubEtapasByEtapaFenologica(visita.phenologicalStageId)
    : [];

  const etapaNombre =
    (visita?.phenologicalStageId
      ? findById(etapas, visita.phenologicalStageId)?.name
      : null) ??
    receta.etapaFenologica ??
    null;

  const subEtapaNombre = visita?.subEtapaId
    ? (findById(subEtapas, visita.subEtapaId)?.name ?? null)
    : null;

  const subEtapaPorcentaje = visita?.subEtapaPercentage ?? null;

  return `
    <h2>Resumen del Diagnostico</h2>
    <div class="visit-summary">
      <div class="visit-data-grid">
        <div class="visit-data-card">
          <p class="visit-data-title">Fenologia</p>
          ${renderFieldRow("Etapa fenologica", etapaNombre ?? receta.etapaFenologica ?? "-")}
          ${subEtapaNombre ? renderFieldRow("Sub etapa", subEtapaNombre) : ""}
          ${
            subEtapaPorcentaje !== null
              ? renderFieldRow("Avance sub etapa", `${subEtapaPorcentaje}%`)
              : ""
          }
        </div>
        ${renderSanidadVisitDataCard("Plagas", consolidacion.plagas)}
        ${renderSanidadVisitDataCard("Enfermedades", consolidacion.enfermedades)}
        ${renderNutricionVisitDataCard(consolidacion.nutricion)}
        ${renderRiegoVisitDataCard(consolidacion)}
        ${renderLaboresVisitDataCard(consolidacion.labores)}
      </div>
    </div>`;
}

function renderFieldRow(label: string, value: string) {
  return `
    <div class="field-row">
      <span class="field-label">${escapeHtml(label)}:</span>
      <span class="field-value">${escapeHtml(value)}</span>
    </div>`;
}

function renderSanidadVisitDataCard(
  title: string,
  items: Array<{
    nombre: string;
    incidencia: string;
    severidad: string;
    organos: string[];
  }>
) {
  if (items.length === 0) {
    return "";
  }

  return `
    <div class="visit-data-card">
      <p class="visit-data-title">${escapeHtml(title)}</p>
      <ul class="compact-list">
        ${items
          .map(
            (item) => `
              <li>
                <strong>${escapeHtml(item.nombre)}</strong><br>
                Incidencia: ${escapeHtml(item.incidencia)}<br>
                Severidad: ${escapeHtml(item.severidad)}<br>
                Organo afectado: ${escapeHtml(formatOrganos(item.organos))}
              </li>`
          )
          .join("")}
      </ul>
    </div>`;
}

function renderNutricionVisitDataCard(
  items: ReturnType<typeof visitaRecetasService.getConsolidacionLocal>["nutricion"]
) {
  if (items.length === 0) {
    return "";
  }

  return `
    <div class="visit-data-card">
      <p class="visit-data-title">Elementos deficitarios</p>
      <ul class="compact-list">
        ${items
          .map(
            (item) => `
              <li>
                <strong>${escapeHtml(item.elemento)}</strong><br>
                Arboles afectados: ${escapeHtml(item.incidencia)}<br>
                Severidad: ${escapeHtml(item.severidad)}
              </li>`
          )
          .join("")}
      </ul>
    </div>`;
}

function renderRiegoVisitDataCard(
  consolidacion: ReturnType<typeof visitaRecetasService.getConsolidacionLocal>
) {
  if (!consolidacion.riego.humedadSuelo && consolidacion.riego.estresHidrico === null) {
    return "";
  }

  return `
    <div class="visit-data-card">
      <p class="visit-data-title">Riego</p>
      ${
        consolidacion.riego.humedadSuelo
          ? renderFieldRow("Humedad del suelo", consolidacion.riego.humedadSuelo)
          : ""
      }
      ${
        consolidacion.riego.estresHidrico !== null
          ? renderFieldRow(
              "Estres hidrico",
              consolidacion.riego.estresHidrico ? "Si" : "No"
            )
          : ""
      }
    </div>`;
}

function renderLaboresVisitDataCard(
  items: ReturnType<typeof visitaRecetasService.getConsolidacionLocal>["labores"]
) {
  const visibleItems = items.filter(
    (item) => !isPositiveLaborSelection(item.nombre, item.categoria)
  );

  if (visibleItems.length === 0) {
    return "";
  }

  return `
    <div class="visit-data-card">
      <p class="visit-data-title">Labores</p>
      <ul class="compact-list">
        ${visibleItems
          .map(
            (item) => `
              <li>
                <strong>${escapeHtml(item.nombre)}</strong><br>
                Nivel seleccionado: ${escapeHtml(item.categoria)}
              </li>`
          )
          .join("")}
      </ul>
    </div>`;
}

function isPositiveLaborSelection(category: string, option: string) {
  const normalizedCategory = normalizeText(category);
  const normalizedOption = normalizeText(option);

  return (
    (normalizedCategory.includes("infestacion") &&
      normalizedCategory.includes("maleza") &&
      normalizedOption === "limpio") ||
    (normalizedCategory.includes("sanitario") &&
      normalizedCategory.includes("suelo") &&
      normalizedOption === "limpio") ||
    (normalizedCategory.includes("copa") && normalizedOption === "buena") ||
    (normalizedCategory.includes("balance") &&
      normalizedCategory.includes("carga") &&
      normalizedOption === "equilibrado")
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function formatOrganos(organos: string[]) {
  if (organos.length === 0) {
    return "No especificado";
  }

  return organos.map(formatOrgano).join(", ");
}

function formatOrgano(organo: string) {
  const labels: Record<string, string> = {
    tronco_rama: "Tronco/rama",
    yema_apical: "Yema apical",
    brote_vegetativo: "Brote vegetativo",
    hoja_tierna: "Hoja tierna",
    hoja_madura: "Hoja madura",
    panicula_floral: "Panicula floral",
    flor_individual: "Flor individual",
    fruto_recien_cuajado: "Fruto recien cuajado",
    fruto_verde: "Fruto verde",
    fruto_maduro: "Fruto maduro",
    raices: "Raices"
  };

  return labels[organo] ?? organo;
}

async function getReportIconUri(): Promise<string | null> {
  if (process?.env?.VITEST) {
    return null;
  }

  try {
    const { Asset } = await import("expo-asset");
    const iconAsset = Asset.fromModule(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../../../../assets/images/icon.png")
    );
    await iconAsset.downloadAsync();
    return iconAsset.localUri ?? iconAsset.uri ?? null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function construirNombreProductor(
  productor: { firstName: string | null; lastName: string | null } | null
): string {
  if (!productor) {
    return "No registrado";
  }
  const nombreCompleto = [productor.firstName, productor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nombreCompleto || "No registrado";
}
