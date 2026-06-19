import { visitaRecetasService } from "./visita-recetas.service";
import type { VisitaRecetaCompleta } from "../types";

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
  async preview(visitaId: string) {
    const { Print } = await loadPdfNativeModules();
    const html = await buildRecetaReportHtml(visitaId);

    await Print.printAsync({ html });
  },

  async share(visitaId: string) {
    const { Print, Sharing } = await loadPdfNativeModules();
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      throw new Error(
        "El dispositivo no permite compartir archivos en este momento."
      );
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

  const iconBase64 = await getReportIconUri();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
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
    .calculated {
      background: #ebf5fb;
      font-style: italic;
      padding: 1px 6px;
      border-radius: 4px;
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
  </style>
</head>
<body>
  <div class="header">
    ${iconBase64 ? `<img alt="AgroGest VSM" class="header-icon" src="${iconBase64}" />` : ""}
    <div class="header-text">
      <h1>Receta de recomendaciones tecnicas</h1>
      <p>AgroGest VSM - ${new Date().toLocaleDateString("es-PE")}</p>
    </div>
  </div>
  ${renderEtapaFenologica(receta)}
  ${renderFitosanidad(receta)}
  ${renderFertilizacion(receta)}
  ${renderRiego(receta)}
  ${renderLabores(receta)}
  <div class="footer">
    Generado automaticamente por AgroGest VSM &middot; Version ${receta.version}
  </div>
</body>
</html>`;
}

function renderEtapaFenologica(receta: VisitaRecetaCompleta): string {
  if (!receta.etapaFenologica) return "";

  return `
    <h2>Datos de la visita</h2>
    <div class="field-row">
      <span class="field-label">Etapa fenologica:</span>
      <span class="field-value">${escapeHtml(receta.etapaFenologica)}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Version:</span>
      <span class="field-value">${receta.version}</span>
    </div>`;
}

function renderFitosanidad(receta: VisitaRecetaCompleta): string {
  if (receta.fitosanidad.length === 0) return "";

  let html = "<h2>Aplicaciones fitosanitarias</h2>";

  for (const app of receta.fitosanidad) {
    html += `
    <div class="section-card">
      <h3>
        <span class="badge">${String(app.numero).padStart(2, "0")}</span>
        ${escapeHtml(app.objetivoNombre)} (${app.objetivo === "plaga" ? "Plaga" : "Enfermedad"})
      </h3>
      <table>
        <tr><th>Campo</th><th>Valor</th></tr>
        <tr><td>Disolvente</td><td>${escapeHtml(app.disolvente)}</td></tr>
        <tr><td>Ingrediente activo</td><td>${escapeHtml(app.ingredienteActivoNombre ?? "-")}</td></tr>
        <tr><td>Dosis i.a.</td><td>${app.dosisIa ?? "-"} mg o mL/cilindro</td></tr>
        <tr><td>Volumen aplicacion</td><td>${app.volumenAplicacion ?? "-"} cilindros/ha</td></tr>
        <tr><td class="calculated">Cantidad total i.a.</td><td class="calculated">${app.cantidadTotalIa ?? "-"} mg o mL</td></tr>
        <tr><td>Marca</td><td>${escapeHtml(app.marcaProductoNombre ?? "-")}</td></tr>
        <tr><td>Concentracion en producto</td><td>${app.concentracionProducto ?? "-"} mg o mL i.a./L</td></tr>
        <tr><td class="calculated">Cantidad total producto</td><td class="calculated">${app.cantidadTotalProducto ?? "-"} L</td></tr>
      </table>`;

    if (app.coadyuvantesIds) {
      html += `<p style="font-size:11px;margin-top:6px;"><strong>Coadyuvantes:</strong> ${renderCoadyuvantesFromIds(app.coadyuvantesIds)}</p>`;
    }

    if (app.ordenMezcla) {
      const mezclaItems = parseJsonArray(app.ordenMezcla);
      if (mezclaItems.length > 0) {
        html += `<div class="mezcla-box"><h4>Orden de mezcla</h4>`;
        mezclaItems.forEach((item, i) => {
          html += `<p>${i + 1}&deg; ${escapeHtml(item)}</p>`;
        });
        html += `</div>`;
      }
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
    html += `
    <div class="section-card">
      <table>
        <tr><th>Campo</th><th>Valor</th></tr>
        <tr><td>Via de aplicacion</td><td>${viaLabel}</td></tr>
        <tr><td>Fertilizante</td><td>${escapeHtml(fert.fertilizanteNombre ?? "-")}</td></tr>
        <tr><td>Tipo de producto</td><td>${tipoLabel}</td></tr>
        <tr><td>Dosis</td><td>${fert.dosis ?? "-"} ${escapeHtml(fert.unidadDosis ?? "")}</td></tr>
        ${fert.cantidadTotalPlantas ? `<tr><td>Cantidad total plantas</td><td>${fert.cantidadTotalPlantas}</td></tr>` : ""}
        ${fert.volumenAplicacion ? `<tr><td>Volumen aplicacion</td><td>${fert.volumenAplicacion}</td></tr>` : ""}
        <tr><td class="calculated">Cantidad total fertilizante</td><td class="calculated">${fert.cantidadTotalFertilizante ?? "-"}</td></tr>
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
    inicio_agoste: "Inicio de agoste",
    ruptura_agoste: "Ruptura de agoste"
  };
  const descriptions: Record<string, string> = {
    riego_pesado: "Aplicar grandes volumenes de agua sobre la superficie del terreno.",
    riego_ligero: "Aplicar una lamina de agua de bajo volumen para humedecer superficialmente.",
    inicio_agoste: "Suspension total o restriccion del riego por 45-60 dias dependiendo del cultivo.",
    ruptura_agoste: "Riego ligero inmediatamente despues de obtener floracion para estimular flor sana y activar el sistema radicular."
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

  let html = "<h2>Recomendacion de labores</h2><div class=\"section-card\">";

  for (const labor of receta.labores) {
    html += `<p><span class="chip">${escapeHtml(labels[labor.labor] ?? labor.labor)}</span></p>`;
  }

  html += "</div>";

  return html;
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
