import type {
  ConsolidacionHallazgo,
  IncidenceLevelLookupItem,
  PestDiseaseLookupItem,
  VisitaDetailData,
  VisitaEvaluacion,
  VisitaObservacionSanitaria,
  VisitaRecetaCompleta
} from "../types/visitas.types";

export function openDiagnosticPdf(detail: VisitaDetailData) {
  openPrintableDocument(
    buildDiagnosticHtml(detail),
    buildDocumentTitle("diagnostico", detail)
  );
}

export function openRecipePdf(
  detail: VisitaDetailData,
  receta: VisitaRecetaCompleta | null,
  consolidacion: ConsolidacionHallazgo
) {
  openPrintableDocument(
    buildRecipeHtml(detail, receta, consolidacion),
    buildDocumentTitle("receta", detail)
  );
}

function openPrintableDocument(html: string, title: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=720");

  if (!popup) {
    throw new Error(
      "El navegador bloqueo la ventana del PDF. Permite ventanas emergentes para descargar el reporte."
    );
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.document.title = title;
  popup.focus();

  window.setTimeout(() => {
    popup.print();
  }, 300);
}

function buildDiagnosticHtml(detail: VisitaDetailData) {
  const { visita } = detail;
  const pestDiseaseMap = createMap(detail.lookups.pestDiseases);
  const levelMap = createMap(detail.lookups.incidenceLevels);
  const tipoRiegoMap = createMap(detail.lookups.tiposRiego);
  const plagas = detail.observacionesSanitarias.filter(
    (item) => pestDiseaseMap.get(item.pestDiseaseId)?.type === "plaga"
  );
  const enfermedades = detail.observacionesSanitarias.filter(
    (item) => pestDiseaseMap.get(item.pestDiseaseId)?.type === "enfermedad"
  );

  return wrapReportHtml({
    title: "Ficha de Visita de campo",
    subtitle: "Reporte de diagnostico generado por AgroGest VSM",
    body: `
      ${renderFields([
        ["Ficha", visita.nroFicha || visita.publicId],
        ["Fecha de visita", formatDate(visita.visitDate)],
        ["Horario", formatTimeRange(visita.startVisitTime, visita.endVisitTime)],
        ["Agronomo", detail.lookups.agronomist?.name ?? `Usuario #${visita.agronomistUserId}`],
        ["Parcela", formatParcela(detail)],
        ["Campaña", detail.lookups.campaign?.name ?? `Campaña #${visita.campaignId}`],
        ["Cultivo", formatCodeName(detail.lookups.crop, visita.cropId)],
        ["Variedad", formatCodeName(detail.lookups.variety, visita.varietyId)],
        ["Etapa fenologica", detail.lookups.phenologicalStage?.name ?? "No registrada"],
        ["Fecha siembra", visita.sowingDate ? formatDate(visita.sowingDate) : "No registrada"],
        ["Numero de plantas", visita.plantsCount ?? "No registrado"],
        ["Area visita", visita.areaHectares ? `${visita.areaHectares} ha` : "No registrada"],
        ["Observacion general", visita.generalObservation || "Sin observacion general", true]
      ])}
      ${renderSection(
        "Plagas",
        renderSanitaryList(plagas, pestDiseaseMap, levelMap, "No hay plagas registradas.")
      )}
      ${renderSection(
        "Enfermedades",
        renderSanitaryList(
          enfermedades,
          pestDiseaseMap,
          levelMap,
          "No hay enfermedades registradas."
        )
      )}
      ${renderSection("Nutricion", renderNutritionList(detail.evaluaciones))}
      ${renderSection("Riego", renderRiego(detail, tipoRiegoMap))}
      ${renderSection("Labores culturales", renderLabores(detail))}
      ${renderSection("Cumplimiento tecnico", renderScores(detail))}
    `
  });
}

function buildRecipeHtml(
  detail: VisitaDetailData,
  receta: VisitaRecetaCompleta | null,
  consolidacion: ConsolidacionHallazgo
) {
  if (!receta) {
    return wrapReportHtml({
      title: "Receta de recomendaciones tecnicas",
      subtitle: "AgroGest VSM",
      body: `<div class="empty">No se ha generado una receta para esta visita todavia.</div>`
    });
  }

  const area = parsePositiveDecimal(detail.visita.areaHectares);

  return wrapReportHtml({
    title: "Receta de recomendaciones tecnicas",
    subtitle: `AgroGest VSM - version ${receta.version}`,
    body: `
      ${renderSection(
        "Resumen del diagnostico",
        `<div class="grid">
          ${renderMiniCard("Fenologia", [
            consolidacion.etapaFenologica ?? receta.etapaFenologica ?? "No registrada"
          ])}
          ${renderMiniCard(
            "Plagas",
            consolidacion.plagas.map(
              (item) =>
                `${item.nombre}: incidencia ${item.incidencia}, severidad ${item.severidad}`
            )
          )}
          ${renderMiniCard(
            "Enfermedades",
            consolidacion.enfermedades.map(
              (item) =>
                `${item.nombre}: incidencia ${item.incidencia}, severidad ${item.severidad}`
            )
          )}
          ${renderMiniCard(
            "Nutricion",
            consolidacion.nutricion.map(
              (item) => `${item.elemento}: ${item.incidencia}, ${item.severidad}`
            )
          )}
          ${renderMiniCard("Riego", [
            consolidacion.riego.humedadSuelo
              ? `Humedad: ${consolidacion.riego.humedadSuelo}`
              : "",
            consolidacion.riego.estresHidrico === null
              ? ""
              : `Estres hidrico: ${consolidacion.riego.estresHidrico ? "Si" : "No"}`
          ])}
          ${renderMiniCard(
            "Labores",
            consolidacion.labores.map((item) => `${item.nombre}: ${item.categoria}`)
          )}
        </div>`
      )}
      ${renderSection("Aplicaciones fitosanitarias", renderFitosanidad(receta, area))}
      ${renderSection("Fertilizacion", renderFertilizacion(receta))}
      ${renderSection("Recomendacion de riego", renderRecipeRiego(receta))}
      ${renderSection("Recomendacion de labores", renderRecipeLabores(receta))}
      ${renderSection("Resumen para el productor", renderProducerSummary(receta))}
    `
  });
}

function wrapReportHtml({
  title,
  subtitle,
  body
}: {
  title: string;
  subtitle: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        color: #1a1f1c;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        background: #fff;
      }
      .header {
        margin-bottom: 18px;
        padding-bottom: 16px;
        border-bottom: 3px solid #2d6a4f;
      }
      h1 {
        margin: 0 0 4px;
        color: #1b4332;
        font-size: 21px;
      }
      .subtitle { margin: 0; color: #53635a; }
      .section { margin-top: 16px; page-break-inside: avoid; }
      h2 {
        margin: 0 0 8px;
        padding: 8px 10px;
        color: #fff;
        background: #2d6a4f;
        border-radius: 6px;
        font-size: 13px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 12px;
      }
      .field,
      .item,
      .mini-card {
        padding: 8px;
        border: 1px solid #d0ddd4;
        border-radius: 7px;
        background: #fafcfa;
      }
      .full { grid-column: 1 / -1; }
      .label {
        display: block;
        color: #53635a;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .value { display: block; margin-top: 2px; color: #1a1f1c; }
      .list { margin: 0; padding: 0; list-style: none; }
      .list li { margin-bottom: 7px; }
      .item-title { display: block; color: #1b4332; font-weight: 700; }
      .muted { color: #53635a; }
      .empty {
        padding: 10px;
        color: #53635a;
        border: 1px dashed #d0ddd4;
        border-radius: 7px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0 12px;
        font-size: 11px;
      }
      th, td {
        padding: 6px 8px;
        text-align: left;
        border: 1px solid #d0ddd4;
      }
      th { background: #eaf3dc; color: #1b4332; }
      .chip {
        display: inline-block;
        margin: 2px 4px 2px 0;
        padding: 2px 8px;
        border-radius: 999px;
        background: #d8f3dc;
        color: #2d6a4f;
        font-size: 10px;
        font-weight: 700;
      }
      .footer {
        margin-top: 22px;
        padding-top: 10px;
        color: #53635a;
        border-top: 1px solid #d0ddd4;
        font-size: 10px;
      }
      @page { margin: 18mm; }
    </style>
  </head>
  <body>
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
    </header>
    ${body}
    <div class="footer">Generado por AgroGest VSM.</div>
  </body>
</html>`;
}

function renderSection(title: string, content: string) {
  return `<section class="section"><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

function renderFields(
  fields: Array<[string, string | number | null | undefined, boolean?]>
) {
  return `<div class="grid">${fields
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(
      ([label, value, full]) => `<div class="field${full ? " full" : ""}">
        <span class="label">${escapeHtml(label)}</span>
        <span class="value">${escapeHtml(String(value))}</span>
      </div>`
    )
    .join("")}</div>`;
}

function renderSanitaryList(
  items: VisitaObservacionSanitaria[],
  pestDiseaseMap: Map<string, PestDiseaseLookupItem>,
  levelMap: Map<string, IncidenceLevelLookupItem>,
  emptyText: string
) {
  if (items.length === 0) return `<div class="empty">${escapeHtml(emptyText)}</div>`;

  return `<ul class="list">${items
    .map((item) => {
      const pestDisease = pestDiseaseMap.get(item.pestDiseaseId);
      const details = [
        item.incidenceLevelId
          ? `Incidencia: ${levelMap.get(item.incidenceLevelId)?.name ?? item.incidenceLevelId}`
          : null,
        item.severityLevelId
          ? `Severidad: ${levelMap.get(item.severityLevelId)?.name ?? item.severityLevelId}`
          : null,
        item.incidencePercentage ? `% arboles enfermos: ${item.incidencePercentage}%` : null,
        item.organosAfectados.length > 0
          ? `Organos: ${item.organosAfectados.map(formatOrgano).join(", ")}`
          : "Organos: No registrados"
      ].filter(Boolean);

      return `<li class="item">
        <span class="item-title">${escapeHtml(pestDisease?.name ?? item.pestDiseaseId)}</span>
        <span class="muted">${escapeHtml(details.join(" | "))}</span>
        ${item.observation ? `<div>${escapeHtml(item.observation)}</div>` : ""}
      </li>`;
    })
    .join("")}</ul>`;
}

function renderNutritionList(items: VisitaEvaluacion[]) {
  if (items.length === 0) {
    return `<div class="empty">No hay datos de nutricion registrados.</div>`;
  }

  return `<ul class="list">${items
    .map((item) => {
      const details = [
        item.incidencePercentage ? `Incidencia: ${item.incidencePercentage}%` : null,
        item.percentage !== null ? `Severidad: ${item.percentage}%` : null,
        item.organosAfectados.length > 0
          ? `Organos: ${item.organosAfectados.map(formatOrgano).join(", ")}`
          : null
      ].filter(Boolean);

      return `<li class="item">
        <span class="item-title">${escapeHtml(item.description)}</span>
        <span class="muted">${escapeHtml(details.join(" | ") || "Sin detalle registrado")}</span>
      </li>`;
    })
    .join("")}</ul>`;
}

function renderRiego(
  detail: VisitaDetailData,
  tipoRiegoMap: Map<string, { name: string }>
) {
  const { riego } = detail;
  if (!riego) return `<div class="empty">No hay informacion de riego registrada.</div>`;

  return renderFields([
    ["Sistema de riego", tipoRiegoMap.get(riego.tipoRiegoId)?.name ?? riego.tipoRiegoId],
    ["Fuente de agua", formatCatalogValue(riego.fuenteAgua)],
    ["Tipo de suelo", formatCatalogValue(riego.tipoSuelo)],
    ["Humedad del suelo", formatCatalogValue(riego.humedadSuelo)],
    [
      "Estres hidrico",
      riego.estresHidrico === null ? "No registrado" : riego.estresHidrico ? "Si" : "No"
    ]
  ]);
}

function renderLabores(detail: VisitaDetailData) {
  if (detail.laboresCulturales.length === 0) {
    return `<div class="empty">No hay labores culturales registradas.</div>`;
  }

  return `<ul class="list">${detail.laboresCulturales
    .map((labor) => {
      const catalog = labor.laborCultural;
      const title = catalog?.categoryName ?? "Labores culturales";
      const value =
        catalog?.optionLabel ?? catalog?.name ?? `Labor #${labor.laborCulturalId}`;

      return `<li class="item">
        <span class="item-title">${escapeHtml(title)}</span>
        <span class="muted">${escapeHtml(
          catalog?.legend ? `${value} (${catalog.legend})` : value
        )}</span>
      </li>`;
    })
    .join("")}</ul>`;
}

function renderScores(detail: VisitaDetailData) {
  if (detail.calificaciones.length === 0) {
    return `<div class="empty">La visita no tiene calificaciones registradas.</div>`;
  }

  return `<ul class="list">${detail.calificaciones
    .map(
      (item) => `<li class="item">
        <span class="item-title">${escapeHtml(getModuloLabel(item.modulo))}: ${item.puntaje}/3</span>
        <span class="muted">${escapeHtml(item.observacion ?? getScoreDescription(item.puntaje))}</span>
      </li>`
    )
    .join("")}</ul>`;
}

function renderMiniCard(title: string, values: string[]) {
  const visibleValues = values.filter(Boolean);

  return `<div class="mini-card">
    <span class="item-title">${escapeHtml(title)}</span>
    <span class="muted">${escapeHtml(
      visibleValues.length > 0 ? visibleValues.join(" | ") : "Sin registro"
    )}</span>
  </div>`;
}

function renderFitosanidad(receta: VisitaRecetaCompleta, areaHectares: number | null) {
  if (receta.fitosanidad.length === 0) {
    return `<div class="empty">No hay aplicaciones fitosanitarias.</div>`;
  }

  return receta.fitosanidad
    .map((item) => {
      const totalIa =
        calculateTotalIa(item.dosisIa, item.volumenAplicacion, areaHectares) ??
        item.cantidadTotalIa;
      const totalProduct =
        calculateTotalProducto(totalIa, item.concentracionProducto) ??
        item.cantidadTotalProducto;

      return `<div class="item">
        <span class="item-title">${String(item.numero).padStart(2, "0")} - ${escapeHtml(
          item.objetivoNombre
        )}</span>
        <table>
          <tr><th>Campo</th><th>Valor</th></tr>
          <tr><td>Objetivo</td><td>${escapeHtml(item.objetivo)}</td></tr>
          <tr><td>Disolvente</td><td>${escapeHtml(item.disolvente)}</td></tr>
          <tr><td>Ingrediente activo</td><td>${escapeHtml(item.ingredienteActivoNombre ?? "-")}</td></tr>
          <tr><td>Dosis i.a.</td><td>${formatNullableNumber(item.dosisIa)} mg o mL/cilindro</td></tr>
          <tr><td>Volumen aplicacion</td><td>${formatNullableNumber(item.volumenAplicacion)} cilindros/ha</td></tr>
          <tr><td>Cantidad total i.a.</td><td>${formatNullableNumber(totalIa)} mg o mL</td></tr>
          <tr><td>Nombre comercial</td><td>${escapeHtml(item.marcaProductoNombre ?? "-")}</td></tr>
          <tr><td>Concentracion producto</td><td>${formatNullableNumber(item.concentracionProducto)} mg o mL i.a./L</td></tr>
          <tr><td>Cantidad total producto</td><td>${formatNullableNumber(totalProduct)} L</td></tr>
        </table>
        ${
          item.ordenMezcla
            ? `<span class="muted">Orden de mezcla: ${escapeHtml(
                parseJsonArray(item.ordenMezcla).join(" -> ") || item.ordenMezcla
              )}</span>`
            : ""
        }
      </div>`;
    })
    .join("");
}

function renderFertilizacion(receta: VisitaRecetaCompleta) {
  if (receta.fertilizacion.length === 0) {
    return `<div class="empty">No hay recomendaciones de fertilizacion.</div>`;
  }

  return `<table>
    <tr>
      <th>Via</th>
      <th>Fertilizante</th>
      <th>Tipo</th>
      <th>Dosis</th>
      <th>Total</th>
    </tr>
    ${receta.fertilizacion
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.viaAplicacion === "edafica" ? "Edafica" : "Foliar")}</td>
          <td>${escapeHtml(item.fertilizanteNombre ?? "-")}</td>
          <td>${escapeHtml(item.tipoProducto ?? "-")}</td>
          <td>${escapeHtml([item.dosis, item.unidadDosis].filter(Boolean).join(" ") || "-")}</td>
          <td>${formatNullableNumber(item.cantidadTotalFertilizante)}</td>
        </tr>`
      )
      .join("")}
  </table>`;
}

function renderRecipeRiego(receta: VisitaRecetaCompleta) {
  if (!receta.riego) return `<div class="empty">No hay recomendacion de riego.</div>`;

  return `<span class="chip">${escapeHtml(formatCatalogValue(receta.riego.tipoRecomendacion))}</span>`;
}

function renderRecipeLabores(receta: VisitaRecetaCompleta) {
  if (receta.labores.length === 0) {
    return `<div class="empty">No hay recomendacion de labores.</div>`;
  }

  return receta.labores
    .map((labor) => `<span class="chip">${escapeHtml(formatCatalogValue(labor.labor))}</span>`)
    .join("");
}

function renderProducerSummary(receta: VisitaRecetaCompleta) {
  const rows = [
    ...receta.fitosanidad.map((item) => [
      item.objetivoNombre,
      item.marcaProductoNombre ?? "-",
      item.cantidadTotalProducto !== null
        ? `${item.cantidadTotalProducto} L`
        : item.dosisIa !== null
          ? `${item.dosisIa} mg o mL/cilindro`
          : "-"
    ]),
    ...receta.fertilizacion.map((item) => [
      item.fertilizanteNombre ?? "Fertilizante",
      item.viaAplicacion,
      [item.dosis, item.unidadDosis].filter(Boolean).join(" ") || "-"
    ])
  ];

  if (rows.length === 0) {
    return `<div class="empty">No hay productos para resumir.</div>`;
  }

  return `<table>
    <tr><th>Objetivo</th><th>Producto</th><th>Dosis</th></tr>
    ${rows
      .map(
        ([target, product, dose]) => `<tr>
          <td>${escapeHtml(target)}</td>
          <td>${escapeHtml(product)}</td>
          <td>${escapeHtml(dose)}</td>
        </tr>`
      )
      .join("")}
  </table>`;
}

function createMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function buildDocumentTitle(prefix: string, detail: VisitaDetailData) {
  return `${prefix}-${detail.visita.nroFicha || detail.visita.publicId}`.replace(
    /[^a-zA-Z0-9-_]+/g,
    "-"
  );
}

function formatParcela(detail: VisitaDetailData) {
  const parcela = detail.lookups.parcela;
  if (!parcela) return `Parcela #${detail.visita.parcelaId}`;
  return `${parcela.code}${parcela.name ? ` - ${parcela.name}` : ""}`;
}

function formatCodeName(item: { name: string; code?: string } | null, fallback: string) {
  if (!item) return fallback;
  return item.code ? `${item.name} (${item.code})` : item.name;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return "No registrado";
  return end ? `${start.slice(0, 5)} - ${end.slice(0, 5)}` : start.slice(0, 5);
}

function formatCatalogValue(value: string | null | undefined) {
  if (!value) return "No registrado";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parsePositiveDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculateTotalIa(
  dosisIa: string | number | null | undefined,
  volumenAplicacion: string | number | null | undefined,
  areaHectares: number | null
) {
  const dosis = parsePositiveDecimal(dosisIa);
  const volumen = parsePositiveDecimal(volumenAplicacion);
  return dosis && volumen ? dosis * volumen * (areaHectares ?? 1) : null;
}

function calculateTotalProducto(
  cantidadTotalIa: string | number | null | undefined,
  concentracionProducto: string | number | null | undefined
) {
  const totalIa = parsePositiveDecimal(cantidadTotalIa);
  const concentracion = parsePositiveDecimal(concentracionProducto);
  return totalIa && concentracion ? totalIa / concentracion : null;
}

function formatNullableNumber(value: string | number | null | undefined) {
  const parsed = parsePositiveDecimal(value);
  return parsed ? parsed.toFixed(2) : "-";
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function formatOrgano(value: string) {
  const labels: Record<string, string> = {
    tronco_rama: "Tronco/rama",
    yema_apical: "Yema apical",
    brote_vegetativo: "Brote vegetativo",
    hoja: "Hoja tierna",
    hoja_tierna: "Hoja tierna",
    hoja_madura: "Hoja madura",
    panicula_floral: "Panicula floral",
    flor_individual: "Flor individual",
    fruto_recien_cuajado: "Fruto recien cuajado",
    fruto_verde: "Fruto verde",
    fruto_maduro: "Fruto maduro",
    raices: "Raices"
  };

  return labels[value] ?? formatCatalogValue(value);
}

function getModuloLabel(modulo: string) {
  const labels: Record<string, string> = {
    plagas: "Plagas",
    enfermedades: "Enfermedades",
    nutricion: "Nutricion",
    riego: "Riego",
    labores: "Labores"
  };

  return labels[modulo] ?? modulo;
}

function getScoreDescription(puntaje: number) {
  if (puntaje === 0) return "Incumplimiento critico";
  if (puntaje === 1) return "Cumplimiento deficiente";
  if (puntaje === 2) return "Cumplimiento parcial";
  return "Cumplimiento optimo";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
