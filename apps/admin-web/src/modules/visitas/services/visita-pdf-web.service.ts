import type {
  CoadyuvanteCatalogItem,
  ConsolidacionHallazgo,
  IncidenceLevelLookupItem,
  PestDiseaseLookupItem,
  TipoRiegoLookupItem,
  VisitaDetailData,
  VisitaEvaluacion,
  VisitaLaborCultural,
  VisitaObservacionSanitaria,
  VisitaRecetaCompleta,
  VisitaStepNote
} from "../types/visitas.types";

export type PrintablePdfWindow = Window;

export function createPrintablePdfWindow() {
  const popup = window.open("", "_blank", "width=980,height=720");

  if (!popup) {
    throw new Error(
      "El navegador bloqueo la ventana del PDF. Intenta nuevamente desde el boton de descarga."
    );
  }

  writePopupHtml(
    popup,
    wrapSimpleHtml({
      title: "Preparando reporte",
      subtitle: "AgroGest VSM",
      body: `<div class="empty">Estamos preparando el documento. Esta ventana se actualizara automaticamente.</div>`
    }),
    "Preparando reporte"
  );

  return popup;
}

export function openDiagnosticPdf(
  detail: VisitaDetailData,
  popup: PrintablePdfWindow = createPrintablePdfWindow()
) {
  openPrintableDocument(
    popup,
    buildDiagnosticHtml(detail),
    buildDocumentTitle("diagnostico", detail)
  );
}

export function openRecipePdf(
  detail: VisitaDetailData,
  receta: VisitaRecetaCompleta | null,
  consolidacion: ConsolidacionHallazgo,
  coadyuvantes: CoadyuvanteCatalogItem[],
  popup: PrintablePdfWindow = createPrintablePdfWindow()
) {
  openPrintableDocument(
    popup,
    buildRecipeHtml(detail, receta, consolidacion, coadyuvantes),
    buildDocumentTitle("receta", detail)
  );
}

export function showPrintablePdfError(popup: PrintablePdfWindow, message: string) {
  writePopupHtml(
    popup,
    wrapSimpleHtml({
      title: "No se pudo preparar el reporte",
      subtitle: "AgroGest VSM",
      body: `<div class="empty">${escapeHtml(message)}</div>`
    }),
    "Error de reporte"
  );
}

function openPrintableDocument(
  popup: PrintablePdfWindow,
  html: string,
  title: string
) {
  writePopupHtml(popup, html, title);
  popup.focus();

  window.setTimeout(() => {
    popup.print();
  }, 300);
}

function writePopupHtml(popup: PrintablePdfWindow, html: string, title: string) {
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.document.title = title;
}

function buildDiagnosticHtml(detail: VisitaDetailData) {
  const { visita } = detail;
  const pestDiseaseMap = createMap(detail.lookups.pestDiseases);
  const levelMap = createMap(detail.lookups.incidenceLevels);
  const tipoRiegoMap = createMap(detail.lookups.tiposRiego);
  const stepNotes = new Map(
    detail.stepNotes.map((stepNote) => [stepNote.stepNumber, stepNote])
  );
  const producerName = formatPersonName(
    detail.lookups.productor?.firstName,
    detail.lookups.productor?.lastName,
    detail.lookups.productor?.documentNumber,
    detail.lookups.productor?.publicId
  );
  const producerFirstName = getFirstName(
    detail.lookups.productor?.firstName,
    detail.lookups.productor?.lastName
  );
  const documentTitle = `Visita ${producerFirstName} ${formatDate(visita.visitDate)}`;
  const subEtapa = visita.subEtapaId
    ? detail.lookups.subEtapas.find((item) => item.id === visita.subEtapaId)
    : null;
  const plagas = detail.observacionesSanitarias.filter(
    (item) => pestDiseaseMap.get(item.pestDiseaseId)?.type === "plaga"
  );
  const enfermedades = detail.observacionesSanitarias.filter(
    (item) => pestDiseaseMap.get(item.pestDiseaseId)?.type === "enfermedad"
  );

  return wrapDiagnosticHtml(
    documentTitle,
    `
    <div class="visit-title">${escapeHtml(documentTitle)}</div>
    <div class="meta">Generado desde AgroGest VSM.</div>

    ${renderSection(
      "Paso 1 - Datos generales",
      renderFields([
        ["Agricultor", producerName],
        ["Parcela", detail.lookups.parcela?.name ?? formatParcela(detail)],
        [
          "Area parcela",
          detail.lookups.parcela?.areaHectares
            ? `${detail.lookups.parcela.areaHectares} ha`
            : null
        ],
        ["Fecha visita", formatDate(visita.visitDate)],
        ["Horario", formatTimeRange(visita.startVisitTime, visita.endVisitTime)],
        ["Cultivo", detail.lookups.crop?.name ?? visita.cropId],
        ["Variedad", detail.lookups.variety?.name ?? visita.varietyId],
        ["Fecha siembra", formatDate(visita.sowingDate)],
        ["Plantas", visita.plantsCount === null ? null : String(visita.plantsCount)],
        ["Area visita", visita.areaHectares ? `${visita.areaHectares} ha` : null],
        [
          "Etapa fenologica",
          detail.lookups.phenologicalStage?.name ?? visita.phenologicalStageId
        ],
        ["Sub etapa", subEtapa?.name ?? visita.subEtapaId],
        [
          "Porcentaje sub etapa",
          visita.subEtapaPercentage === null ? null : `${visita.subEtapaPercentage}%`
        ],
        ["Observacion general", visita.generalObservation, true],
        ["Observacion del paso", stepNotes.get(1)?.observation ?? null, true],
        ["Recomendacion del paso", stepNotes.get(1)?.recommendation ?? null, true]
      ])
    )}

    ${renderSection(
      "Paso 2 - Plagas",
      renderSanitaryObservations(
        plagas,
        pestDiseaseMap,
        levelMap,
        "plagas"
      ) + renderStepNote(stepNotes.get(2))
    )}

    ${renderSection(
      "Paso 3 - Enfermedades",
      renderSanitaryObservations(
        enfermedades,
        pestDiseaseMap,
        levelMap,
        "enfermedades"
      ) + renderStepNote(stepNotes.get(3))
    )}

    ${renderSection(
      "Paso 4 - Nutricion",
      renderNutrition(detail.evaluaciones) + renderStepNote(stepNotes.get(4))
    )}

    ${renderSection(
      "Paso 5 - Riego",
      renderDiagnosticRiego(detail.riego, tipoRiegoMap) + renderStepNote(stepNotes.get(5))
    )}

    ${renderSection(
      "Paso 6 - Labores culturales",
      renderCulturalLabors(detail.laboresCulturales) + renderStepNote(stepNotes.get(6))
    )}

    <div class="footer">
      Este reporte omite la ubicacion de la visita y se genera con la informacion sincronizada disponible.
    </div>`
  );
}

function buildRecipeHtml(
  detail: VisitaDetailData,
  receta: VisitaRecetaCompleta | null,
  consolidacion: ConsolidacionHallazgo,
  coadyuvantes: CoadyuvanteCatalogItem[]
) {
  if (!receta) {
    return `<html><body style="font-family: sans-serif; padding: 40px; color: #555;">
      <h2>Sin receta disponible</h2>
      <p>No se ha generado una receta para esta visita todavia.</p>
    </body></html>`;
  }

  const calculationAreaHectares = resolveCalculationAreaHectares(
    detail.lookups.parcela?.areaHectares,
    detail.visita.areaHectares
  );

  return wrapRecipeHtml(`
    ${renderDatosVisitaReceta(detail, receta, consolidacion)}
    ${renderFitosanidad(receta, calculationAreaHectares, coadyuvantes)}
    ${renderFertilizacion(receta)}
    ${renderRecipeRiego(receta)}
    ${renderRecipeLabores(receta)}
    ${renderResumenProductor(receta)}
    <div class="footer">
      Generado automaticamente por AgroGest VSM
    </div>`);
}

function wrapDiagnosticHtml(title: string, body: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 34px;
        color: #1a1f1c;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        background: #ffffff;
      }
      .header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding-bottom: 18px;
        border-bottom: 3px solid #2d6a4f;
      }
      .header-copy { flex: 1; }
      .document-title {
        margin: 0 0 4px;
        color: #1b4332;
        font-size: 20px;
        font-weight: 700;
      }
      .subtitle {
        margin: 0;
        color: #53635a;
        font-size: 12px;
      }
      .visit-title {
        margin: 18px 0 8px;
        color: #2d6a4f;
        font-size: 16px;
        font-weight: 700;
      }
      .meta {
        margin-bottom: 14px;
        color: #53635a;
        font-size: 11px;
      }
      .section {
        margin-top: 16px;
        page-break-inside: avoid;
      }
      .section h2 {
        margin: 0 0 8px;
        padding: 8px 10px;
        color: #ffffff;
        background: #2d6a4f;
        border-radius: 6px;
        font-size: 13px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px 12px;
      }
      .field {
        padding: 7px 8px;
        border: 1px solid #d0ddd4;
        border-radius: 6px;
        background: #fafcfa;
      }
      .label {
        display: block;
        color: #53635a;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .value {
        display: block;
        margin-top: 2px;
        color: #1a1f1c;
        font-size: 12px;
      }
      .full { grid-column: 1 / -1; }
      .list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .list li {
        margin-bottom: 7px;
        padding: 8px;
        border: 1px solid #d0ddd4;
        border-radius: 6px;
        background: #fafcfa;
      }
      .item-title {
        display: block;
        color: #1b4332;
        font-weight: 700;
      }
      .muted { color: #53635a; }
      .empty {
        padding: 8px;
        color: #53635a;
        border: 1px dashed #d0ddd4;
        border-radius: 6px;
      }
      .footer {
        margin-top: 24px;
        padding-top: 10px;
        color: #53635a;
        border-top: 1px solid #d0ddd4;
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="header-copy">
        <h1 class="document-title">Ficha de Visita de campo</h1>
        <p class="subtitle">Reporte generado por Agrogest VSM</p>
      </div>
    </header>
    ${body}
  </body>
</html>`;
}

function wrapRecipeHtml(body: string) {
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
    .field-value { color: #1a1f1c; }
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
    .compact-list li { margin-bottom: 4px; }
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
    <div class="header-text">
      <h1>Receta de recomendaciones tecnicas</h1>
      <p>AgroGest VSM - ${new Date().toLocaleDateString("es-PE")}</p>
    </div>
  </div>
  ${body}
</body>
</html>`;
}

function wrapSimpleHtml({
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
      body {
        margin: 0;
        padding: 32px;
        color: #1a1f1c;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        background: #fff;
      }
      h1 { margin: 0 0 4px; color: #1b4332; font-size: 21px; }
      .subtitle { margin: 0 0 18px; color: #53635a; }
      .empty {
        padding: 10px;
        color: #53635a;
        border: 1px dashed #d0ddd4;
        border-radius: 7px;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${body}
  </body>
</html>`;
}

function renderSection(title: string, content: string) {
  return `<section class="section"><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

function renderFields(
  fields: Array<[string, string | number | null | undefined, boolean?]>
) {
  const visibleFields = fields.filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  if (visibleFields.length === 0) {
    return `<div class="empty">No hay informacion registrada.</div>`;
  }

  return `<div class="grid">${visibleFields
    .map(
      ([label, value, full]) => `<div class="field${full ? " full" : ""}">
        <span class="label">${escapeHtml(label)}</span>
        <span class="value">${escapeHtml(String(value))}</span>
      </div>`
    )
    .join("")}</div>`;
}

function renderSanitaryObservations(
  observations: VisitaObservacionSanitaria[],
  pestDiseaseMap: Map<string, PestDiseaseLookupItem>,
  levelMap: Map<string, IncidenceLevelLookupItem>,
  emptyLabel: string
) {
  if (observations.length === 0) {
    return `<div class="empty">No hay ${emptyLabel} registradas.</div>`;
  }

  return `<ul class="list">${observations
    .map((observation) => {
      const pestDisease = pestDiseaseMap.get(observation.pestDiseaseId);
      const incidence = observation.incidenceLevelId
        ? levelMap.get(observation.incidenceLevelId)?.name
        : null;
      const severity = observation.severityLevelId
        ? levelMap.get(observation.severityLevelId)?.name
        : null;
      const details = [
        pestDisease?.type,
        incidence ? `Incidencia: ${incidence}` : null,
        severity ? `Severidad: ${severity}` : null,
        observation.incidencePercentage
          ? `% arboles enfermos: ${formatPercentValue(observation.incidencePercentage)}`
          : null,
        observation.organosAfectados.length > 0
          ? `Organos: ${observation.organosAfectados.map(formatOrgano).join(", ")}`
          : "Organos: No registrados"
      ].filter(Boolean);

      return `<li>
        <span class="item-title">${escapeHtml(pestDisease?.name ?? observation.pestDiseaseId)}</span>
        <span class="muted">${escapeHtml(details.join(" | ") || "Sin nivel registrado")}</span>
        ${observation.observation ? `<div>${escapeHtml(observation.observation)}</div>` : ""}
      </li>`;
    })
    .join("")}</ul>`;
}

function renderNutrition(evaluations: VisitaEvaluacion[]) {
  if (evaluations.length === 0) {
    return `<div class="empty">No hay datos de nutricion registrados.</div>`;
  }

  return `<ul class="list">${evaluations
    .map((evaluation) => {
      const details = [
        evaluation.incidencePercentage
          ? `Incidencia: ${formatPercentValue(evaluation.incidencePercentage)}`
          : null,
        evaluation.percentage !== null
          ? `Severidad: ${formatPercentValue(evaluation.percentage)}`
          : null,
        evaluation.organosAfectados.length > 0
          ? `Organos: ${evaluation.organosAfectados.map(formatOrgano).join(", ")}`
          : "Organos: No registrados"
      ].filter(Boolean);

      return `<li>
        <span class="item-title">${escapeHtml(evaluation.description)}</span>
        <span class="muted">${escapeHtml(details.join(" | ") || "Sin detalle registrado")}</span>
      </li>`;
    })
    .join("")}</ul>`;
}

function renderDiagnosticRiego(
  riego: VisitaDetailData["riego"],
  tiposRiego: Map<string, TipoRiegoLookupItem>
) {
  if (!riego) {
    return `<div class="empty">No hay informacion de riego registrada.</div>`;
  }

  const tipoRiego = tiposRiego.get(riego.tipoRiegoId);
  const tipoRiegoLabel = tipoRiego
    ? appendDescription(tipoRiego.name, tipoRiego.description)
    : `Tipo registrado: ${riego.tipoRiegoId}`;

  return renderFields([
    ["Tipo de riego", tipoRiegoLabel, true],
    ["Fuente de agua", riego.fuenteAgua ? formatCatalogValue(riego.fuenteAgua) : "No registrada", true],
    ["Tipo de suelo", riego.tipoSuelo ? formatCatalogValue(riego.tipoSuelo) : "No registrado", true],
    ["Humedad del suelo", riego.humedadSuelo ? formatCatalogValue(riego.humedadSuelo) : "No registrada", true],
    [
      "Estres hidrico intencional",
      riego.estresHidrico === null ? "No registrado" : riego.estresHidrico ? "Si" : "No",
      true
    ]
  ]);
}

function renderCulturalLabors(selectedLabors: VisitaLaborCultural[]) {
  if (selectedLabors.length === 0) {
    return `<div class="empty">No hay labores culturales registradas.</div>`;
  }

  const items = selectedLabors
    .map((selectedLabor) => {
      const labor = selectedLabor.laborCultural;

      return {
        category: labor?.categoryName ?? "Labores culturales",
        option:
          labor?.optionLabel ??
          labor?.name ??
          `Seleccion registrada: ${selectedLabor.laborCulturalId}`,
        legend: labor?.legend ?? labor?.description ?? null,
        sortOrder: labor?.sortOrder ?? 9999
      };
    })
    .filter((item) => !isPositiveLaborSelection(item.category, item.option))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.category.localeCompare(right.category)
    );

  if (items.length === 0) {
    return `<div class="empty">No hay alertas de labores culturales registradas.</div>`;
  }

  return `<ul class="list">${items
    .map(
      (item) => `<li>
        <span class="item-title">${escapeHtml(item.category)}</span>
        <span class="muted">${escapeHtml(
          item.legend ? `${item.option} (${item.legend})` : item.option
        )}</span>
      </li>`
    )
    .join("")}</ul>`;
}

function renderStepNote(note: VisitaStepNote | null | undefined) {
  if (!note?.observation && !note?.recommendation) {
    return "";
  }

  return `<div style="margin-top: 8px;">${renderFields([
    ["Observacion del paso", note.observation, true],
    ["Recomendacion del paso", note.recommendation, true]
  ])}</div>`;
}

function renderDatosVisitaReceta(
  detail: VisitaDetailData,
  receta: VisitaRecetaCompleta,
  consolidacion: ConsolidacionHallazgo
) {
  const subEtapa = detail.visita.subEtapaId
    ? detail.lookups.subEtapas.find((item) => item.id === detail.visita.subEtapaId)
    : null;
  const etapaNombre =
    detail.lookups.phenologicalStage?.name ?? receta.etapaFenologica ?? null;

  return `
    <h2>Resumen del Diagnostico</h2>
    <div class="visit-summary">
      <div class="visit-data-grid">
        <div class="visit-data-card">
          <p class="visit-data-title">Fenologia</p>
          ${renderFieldRow("Etapa fenologica", etapaNombre ?? receta.etapaFenologica ?? "-")}
          ${subEtapa ? renderFieldRow("Sub etapa", subEtapa.name) : ""}
          ${
            detail.visita.subEtapaPercentage !== null
              ? renderFieldRow("Avance sub etapa", `${detail.visita.subEtapaPercentage}%`)
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

function renderNutricionVisitDataCard(items: ConsolidacionHallazgo["nutricion"]) {
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

function renderRiegoVisitDataCard(consolidacion: ConsolidacionHallazgo) {
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

function renderLaboresVisitDataCard(items: ConsolidacionHallazgo["labores"]) {
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

function renderFitosanidad(
  receta: VisitaRecetaCompleta,
  calculationAreaHectares: number | null,
  coadyuvantes: CoadyuvanteCatalogItem[]
) {
  if (receta.fitosanidad.length === 0) return "";

  let html = "<h2>Aplicaciones fitosanitarias</h2>";

  for (const app of receta.fitosanidad) {
    const calculatedTotalIa =
      calculateTotalIa(app.dosisIa, app.volumenAplicacion, calculationAreaHectares) ??
      app.cantidadTotalIa;
    const calculatedTotalProducto =
      calculateTotalProducto(calculatedTotalIa, app.concentracionProducto) ??
      app.cantidadTotalProducto;

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
        <tr><td class="calculated">Cantidad total i.a.</td><td class="calculated">${formatNumber(calculatedTotalIa)} mg o mL</td></tr>
        <tr><td>Nombre comercial</td><td>${escapeHtml(app.marcaProductoNombre ?? "-")}</td></tr>
        <tr><td>Concentracion en producto</td><td>${app.concentracionProducto ?? "-"} mg o mL i.a./L</td></tr>
        <tr><td class="calculated">Cantidad total producto</td><td class="calculated">${formatNumber(calculatedTotalProducto)} L</td></tr>
      </table>`;

    if (calculationAreaHectares !== null) {
      html += `<p class="calc-hint">Area usada para el calculo: ${formatNumber(calculationAreaHectares)} ha.</p>`;
    }

    if (app.coadyuvantesIds) {
      html += `<p style="font-size:11px;margin-top:6px;"><strong>Coadyuvantes:</strong> ${renderCoadyuvantesFromIds(app.coadyuvantesIds, coadyuvantes)}</p>`;
    }

    if (app.ordenMezcla) {
      const mezclaItems = parseJsonArray(app.ordenMezcla);
      if (mezclaItems.length > 0) {
        html += `<div class="mezcla-box"><h4>Orden de mezcla</h4>`;
        mezclaItems.forEach((item, index) => {
          html += `<p>${index + 1}&deg; ${escapeHtml(item)}</p>`;
        });
        html += `</div>`;
      }
    }

    html += `</div>`;
  }

  return html;
}

function renderCoadyuvantesFromIds(
  idsJson: string,
  coadyuvantes: CoadyuvanteCatalogItem[]
) {
  try {
    const ids = JSON.parse(idsJson) as string[];
    const names = ids
      .map((id) => coadyuvantes.find((coadyuvante) => coadyuvante.id === id)?.name ?? id)
      .filter(Boolean);

    return names.map((name) => `<span class="chip">${escapeHtml(name)}</span>`).join(" ");
  } catch {
    return escapeHtml(idsJson);
  }
}

function renderFertilizacion(receta: VisitaRecetaCompleta) {
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

function renderRecipeRiego(receta: VisitaRecetaCompleta) {
  if (!receta.riego) return "";

  const labels: Record<string, string> = {
    riego_pesado: "Riego pesado",
    riego_ligero: "Riego ligero",
    inicio_agoste: "Agoste",
    ruptura_agoste: "Agoste"
  };
  const descriptions: Record<string, string> = {
    riego_pesado: "Aplicar grandes volumenes de agua sobre la superficie del terreno.",
    riego_ligero: "Aplicar una lamina de agua de bajo volumen para humedecer superficialmente.",
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

function renderRecipeLabores(receta: VisitaRecetaCompleta) {
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

function renderResumenProductor(receta: VisitaRecetaCompleta) {
  if (receta.fitosanidad.length === 0 && receta.fertilizacion.length === 0) {
    return "";
  }

  return `
    <h2>Resumen para el productor</h2>
    <div class="producer-summary">
      ${renderResumenFitosanitario(receta)}
      ${renderResumenFertilizacion(receta)}
    </div>`;
}

function renderResumenFitosanitario(receta: VisitaRecetaCompleta) {
  if (receta.fitosanidad.length === 0) {
    return "";
  }

  return `
    <h3>Productos fitosanitarios</h3>
    <table>
      <tr><th>Objetivo</th><th>Nombre comercial</th><th>Dosis</th></tr>
      ${receta.fitosanidad
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

function renderResumenFertilizacion(receta: VisitaRecetaCompleta) {
  if (receta.fertilizacion.length === 0) {
    return "";
  }

  return `
    <h3>Fertilizantes</h3>
    <table>
      <tr><th>Fertilizante</th><th>Via</th><th>Dosis</th></tr>
      ${receta.fertilizacion
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.fertilizanteNombre ?? "-")}</td>
              <td>${escapeHtml(item.viaAplicacion === "edafica" ? "Edafica" : "Foliar")}</td>
              <td>${escapeHtml(formatFertilizacionDosis(item))}</td>
            </tr>`
        )
        .join("")}
    </table>`;
}

function formatFitosanidadDosis(
  item: VisitaRecetaCompleta["fitosanidad"][number]
) {
  if (item.cantidadTotalProducto !== null && item.cantidadTotalProducto !== undefined) {
    return `${item.cantidadTotalProducto} L`;
  }

  if (item.dosisIa !== null && item.dosisIa !== undefined) {
    return `${item.dosisIa} mg o mL/cilindro`;
  }

  return "-";
}

function formatFertilizacionDosis(
  item: VisitaRecetaCompleta["fertilizacion"][number]
) {
  const parts = [item.dosis, item.unidadDosis].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "-";
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

function formatDate(value?: string | null) {
  if (!value) {
    return "No registrado";
  }

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
  return end ? `${start} - ${end}` : start;
}

function formatCatalogValue(value: string | null | undefined) {
  if (!value) return "No registrado";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPercentValue(value: string | number) {
  const text = String(value).trim();
  return text.endsWith("%") ? text : `${text}%`;
}

function formatPersonName(
  firstName?: string | null,
  lastName?: string | null,
  documentNumber?: string | null,
  publicId?: string | null
) {
  const value = [firstName, lastName].filter(Boolean).join(" ").trim();
  return value || documentNumber || publicId || "No registrado";
}

function getFirstName(firstName?: string | null, lastName?: string | null) {
  return firstName?.trim() || lastName?.trim().split(/\s+/)[0] || "Agricultor";
}

function formatOrganos(organos: string[]) {
  if (organos.length === 0) {
    return "No especificado";
  }

  return organos.map(formatOrgano).join(", ");
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

function appendDescription(label: string, description: string | null | undefined) {
  return description ? `${label} (${description})` : label;
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

function resolveCalculationAreaHectares(
  parcelaArea: string | number | null | undefined,
  visitaArea: string | number | null | undefined
) {
  return parsePositiveDecimal(parcelaArea) ?? parsePositiveDecimal(visitaArea);
}

function parsePositiveDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getEffectiveCalculationArea(areaHectares: number | null) {
  return areaHectares ?? 1;
}

function calculateTotalIa(
  dosisIa: string | number | null | undefined,
  volumenAplicacion: string | number | null | undefined,
  areaHectares: number | null
) {
  const dosis = parsePositiveDecimal(dosisIa);
  const volumen = parsePositiveDecimal(volumenAplicacion);

  return dosis && volumen
    ? dosis * volumen * getEffectiveCalculationArea(areaHectares)
    : null;
}

function calculateTotalProducto(
  cantidadTotalIa: string | number | null | undefined,
  concentracionProducto: string | number | null | undefined
) {
  const totalIa = parsePositiveDecimal(cantidadTotalIa);
  const concentracion = parsePositiveDecimal(concentracionProducto);

  return totalIa && concentracion ? totalIa / concentracion : null;
}

function formatNumber(value: string | number | null | undefined, decimals = 2) {
  const parsed = parsePositiveDecimal(value);
  return parsed ? parsed.toFixed(decimals) : "-";
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
