import { visitaRecetasService } from "./visita-recetas.service";
import type { VisitaRecetaCompleta } from "../types";
import { parcelasRepository } from "../../parcelas/repositories/parcelas.repository";
import { productoresRepository } from "../../productores/repositories/productores.repository";
import { visitasCampoRepository } from "../../visitas-campo/repositories/visitas-campo.repository";
import { REPORT_IMAGE_WIDTH } from "../../../shared/reporting/report-config";
import {
  formatDoseUnit,
  formatFertilizacionDosis,
  formatFitosanidadDosis,
  getFertilizacionTotalUnit,
  getFitosanidadAggregateUnit
} from "../domain/dose-unit-format";
import { formatRecommendationApproach } from "../domain/recommendation-approach";

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
    h3 {
      font-size: 13px;
      color: #1b4332;
      margin: 8px 0 4px 0;
    }
    .chip {
      display: inline-block;
      background: #d8f3dc;
      color: #2d6a4f;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 4px;
      margin-bottom: 4px;
    }
    .chip-warning {
      background: #fef9e7;
      color: #b45309;
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
    .visit-data-card--wide {
      grid-column: 1 / -1;
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
    .calculated {
      background: #ebf5fb;
      font-style: italic;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .calc-hint {
      color: #6b7a6f;
      font-size: 10px;
      margin-top: -4px;
    }
    .mezcla-box {
      background: #fef9e7;
      border: 1px solid #f3cd8c;
      border-radius: 8px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 11px;
    }
    .mezcla-box h4 {
      font-size: 11px;
      color: #92400e;
      margin-bottom: 4px;
    }
    .section-card {
      background: #fafcfa;
      border: 1px solid #e8efe9;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      background: #2d6a4f;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #d0ddd4;
      font-size: 10px;
      color: #6b7a6f;
      text-align: center;
    }
    .producer-summary {
      background: #f7fbf8;
      border: 1px solid #b7d7c3;
      border-radius: 8px;
      padding: 12px;
      margin-top: 14px;
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
  ${renderResumenProductor(receta)}
  ${renderDatosVisita(visita, receta, consolidacion)}
  ${renderFitosanidad(receta)}
  ${renderFertilizacion(receta)}
  ${renderRiego(receta)}
  ${renderLabores(receta)}
  <div class="footer">
    Generado automaticamente por AgroGest VSM
  </div>
</body>
</html>`;
}

function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function parsePositiveDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatNumber(value: string | number | null | undefined, decimals = 2) {
  const parsed = parsePositiveDecimal(value);
  return parsed ? parsed.toFixed(decimals) : "-";
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

function renderFitosanidad(receta: VisitaRecetaCompleta): string {
  if (receta.mezclas.length === 0) return "";

  let html = "<h2>Mezclas fitosanitarias</h2>";

  for (const mezcla of receta.mezclas) {
    html += `
    <div class="section-card">
      <h3><span class="badge">${String(mezcla.numero).padStart(2, "0")}</span> Mezcla ${mezcla.numero}</h3>
      <table>
        <tr><th>Campo</th><th>Valor</th></tr>
        <tr><td>Volumen aplicacion</td><td>${mezcla.volumenAplicacion ?? "-"} cilindros/ha</td></tr>
        <tr><td>Factor de incidencia</td><td>${mezcla.factor}</td></tr>
      </table>`;

    if (mezcla.coadyuvantesIds) {
      html += `<p style="font-size:11px;margin-top:6px;"><strong>Coadyuvantes:</strong> ${renderCoadyuvantesFromIds(mezcla.coadyuvantesIds)}</p>`;
    }

    if (mezcla.ordenMezcla) {
      const mezclaItems = parseJsonArray(mezcla.ordenMezcla);
      if (mezclaItems.length > 0) {
        html += `<div class="mezcla-box"><h4>Orden de mezcla</h4>`;
        mezclaItems.forEach((item, i) => {
          html += `<p>${i + 1}&deg; ${escapeHtml(item)}</p>`;
        });
        html += `</div>`;
      }
    }

    html += `<table><tr><th>Objetivo / producto</th><th>Dosis comercial</th><th>Total por ha</th></tr>`;
    for (const producto of mezcla.productos) {
      const total =
        calculateRecipeTotal(
          producto.dosisProducto,
          mezcla.volumenAplicacion,
          mezcla.factor
        ) ?? producto.cantidadTotalProducto;
      html += `<tr>
        <td><strong>${escapeHtml(formatRecommendationApproach(producto.enfoque, true))}</strong> · ${escapeHtml(producto.objetivoNombre)} / ${escapeHtml(producto.marcaProductoNombre ?? producto.ingredienteActivoNombre ?? "-")}</td>
        <td>${producto.dosisProducto ?? "-"} ${escapeHtml(formatDoseUnit(producto.unidadDosis, "cilindro"))}</td>
        <td class="calculated">${formatNumber(total)} ${escapeHtml(formatDoseUnit(producto.unidadDosis, "ha"))}</td>
      </tr>`;
    }
    html += `</table>`;

    const aggregateUnit = getFitosanidadAggregateUnit(
      mezcla.productos.map((producto) => producto.unidadDosis)
    );
    if (mezcla.cantidadTotalProducto && aggregateUnit) {
      html += `<p style="font-size:13px;margin-top:8px;"><strong>Cantidad total a aplicar:</strong> <span class="calculated">${formatNumber(mezcla.cantidadTotalProducto)} ${escapeHtml(aggregateUnit)}</span></p>`;
    }

    html += `</div>`;
  }

  return html;
}

function renderCoadyuvantesFromIds(idsJson: string): string {
  try {
    const ids = JSON.parse(idsJson) as string[];
    const catalogos = visitaRecetasService.getCatalogos();
    const names = ids
      .map((id) => catalogos.coadyuvantes.find((c) => c.id === id)?.name ?? id)
      .filter(Boolean);

    return names.map((n) => `<span class="chip">${escapeHtml(n)}</span>`).join(" ");
  } catch {
    return escapeHtml(idsJson);
  }
}

function renderFertilizacion(receta: VisitaRecetaCompleta): string {
  if (receta.fertilizacion.length === 0) return "";

  let html = "<h2>Fertilizacion</h2>";

  for (const fert of receta.fertilizacion) {
    const viaLabel = fert.viaAplicacion === "edafica" ? "Edafica" : "Foliar";
    const tipoLabel = fert.tipoProducto === "liquido" ? "Liquido" : "Solido";
    const total =
      calculateRecipeTotal(
        fert.dosis,
        fert.viaAplicacion === "edafica"
          ? fert.cantidadTotalPlantas
          : fert.volumenAplicacion,
        fert.factor
      ) ?? fert.cantidadTotalFertilizante;
    const unidadTotal = fert.unidadDosis?.split("/")[0] ?? "";
    html += `
    <div class="section-card">
      <table>
        <tr><th>Campo</th><th>Valor</th></tr>
        <tr><td>Enfoque</td><td><strong>${escapeHtml(formatRecommendationApproach(fert.enfoque))}</strong></td></tr>
        <tr><td>Via de aplicacion</td><td>${viaLabel}</td></tr>
        <tr><td>Fertilizante</td><td>${escapeHtml(fert.fertilizanteNombre ?? "-")}</td></tr>
        <tr><td>Tipo de producto</td><td>${tipoLabel}</td></tr>
        <tr><td>Dosis</td><td>${fert.dosis ?? "-"} ${escapeHtml(fert.unidadDosis ?? "")}</td></tr>
        <tr><td>Factor de incidencia</td><td>${fert.factor}</td></tr>
        ${fert.cantidadTotalPlantas ? `<tr><td>Cantidad total plantas</td><td>${fert.cantidadTotalPlantas}</td></tr>` : ""}
        ${fert.volumenAplicacion ? `<tr><td>Volumen aplicacion</td><td>${fert.volumenAplicacion}</td></tr>` : ""}
        <tr><td class="calculated">Cantidad total fertilizante</td><td class="calculated">${formatNumber(total)} ${escapeHtml(unidadTotal)}</td></tr>
      </table>
    </div>`;
  }

  return html;
}

function renderRiego(receta: VisitaRecetaCompleta): string {
  if (!receta.riego) return "";

  const labels: Record<string, string> = {
    riego_pesado: "Riego pesado",
    riego_ligero: "Riego ligero",
    inicio_agoste: "Agoste",
    ruptura_agoste: "Agoste"
  };
  const descriptions: Record<string, string> = {
    riego_pesado: "Aplicar grandes volumenes de agua sobre la superficie del terreno.",
    riego_ligero:
      "Aplicar una lamina de agua de bajo volumen para humedecer superficialmente.",
    inicio_agoste:
      "Suspension o restriccion controlada del riego para inducir el manejo fenologico del cultivo.",
    ruptura_agoste:
      "Suspension o restriccion controlada del riego para inducir el manejo fenologico del cultivo."
  };

  return `
    <h2>Recomendacion de riego</h2>
    <div class="section-card">
      <h3>${labels[receta.riego.tipoRecomendacion] ?? receta.riego.tipoRecomendacion}</h3>
      <p style="font-size:11px;color:#6b7a6f;">${descriptions[receta.riego.tipoRecomendacion] ?? ""}</p>
    </div>`;
}

function renderLabores(receta: VisitaRecetaCompleta): string {
  if (receta.labores.length === 0) return "";

  const labels: Record<string, string> = {
    limpieza_maleza_pala: "Limpieza de maleza con pala",
    limpieza_maleza_motoguadana: "Limpieza de maleza con motoguadana",
    horqueteo: "Horqueteo",
    enzunchado: "Enzunchado",
    recoleccion_frutos: "Recoleccion y manejo de frutos caidos",
    trampas_mosca: "Colocacion de trampas de mosca de la fruta"
  };

  let html = '<h2>Recomendacion de labores</h2><div class="section-card">';

  for (const labor of receta.labores) {
    html += `<p><span class="chip">${escapeHtml(labels[labor.labor] ?? labor.labor)}</span></p>`;
  }

  html += "</div>";

  return html;
}

function renderResumenProductor(receta: VisitaRecetaCompleta): string {
  if (receta.mezclas.length === 0 && receta.fertilizacion.length === 0) {
    return "";
  }

  return `
    <h2>Resumen para el productor</h2>
    <div class="producer-summary">
      ${renderResumenFitosanitario(receta)}
      ${renderResumenFertilizacion(receta)}
    </div>`;
}

function renderResumenFitosanitario(receta: VisitaRecetaCompleta): string {
  if (receta.mezclas.length === 0) {
    return "";
  }

  return `
    <h3>Productos fitosanitarios</h3>
    <table>
      <tr><th>Objetivo</th><th>Nombre comercial</th><th>Dosis</th></tr>
      ${receta.mezclas
        .flatMap((mezcla) => mezcla.productos)
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.objetivoNombre)}</td>
              <td>${escapeHtml(item.marcaProductoNombre ?? "-")}</td>
              <td>${escapeHtml(formatFitosanidadDosis(item))}</td>
            </tr>`
        )
        .join("")}
    </table>`;
}

function renderResumenFertilizacion(receta: VisitaRecetaCompleta): string {
  if (receta.fertilizacion.length === 0) {
    return "";
  }

  return `
    <h3>Fertilizantes</h3>
    <table>
      <tr><th>Fertilizante</th><th>Via</th><th>Dosis</th><th>Factor</th><th>Total</th></tr>
      ${receta.fertilizacion
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.fertilizanteNombre ?? "-")}</td>
              <td>${escapeHtml(item.viaAplicacion === "edafica" ? "Edafica" : "Foliar")}</td>
              <td>${escapeHtml(formatFertilizacionDosis(item))}</td>
              <td>${item.factor}</td>
              <td>${item.cantidadTotalFertilizante ?? "-"} ${escapeHtml(getFertilizacionTotalUnit(item.unidadDosis, item.tipoProducto))}</td>
            </tr>`
        )
        .join("")}
    </table>`;
}

function calculateRecipeTotal(
  dosis: number | null | undefined,
  volumen: number | null | undefined,
  factor: number
) {
  return dosis !== null &&
    dosis !== undefined &&
    volumen !== null &&
    volumen !== undefined
    ? dosis * volumen * factor
    : null;
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

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
