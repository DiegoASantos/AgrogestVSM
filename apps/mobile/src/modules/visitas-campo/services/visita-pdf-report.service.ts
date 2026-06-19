import { laboresCulturalesVisitaRepository } from "../../labores-culturales-visita/repositories/labores-culturales-visita.repository";
import { observacionesSanitariasRepository } from "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { parcelasRepository } from "../../parcelas/repositories/parcelas.repository";
import { productoresRepository } from "../../productores/repositories/productores.repository";
import { riegosRepository } from "../../riegos/repositories/riegos.repository";
import {
  FUENTE_AGUA_LABELS,
  TIPO_SUELO_LABELS,
  HUMEDAD_SUELO_LABELS
} from "../../riegos/types";
import { visitasCampoRepository } from "../repositories/visitas-campo.repository";
import { visitasCampoService } from "./visitas-campo.service";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export const visitaPdfReportService = {
  async preview(visitaId: string) {
    const { Print } = await loadPdfNativeModules();
    const html = await buildVisitReportHtml(visitaId);

    await Print.printAsync({
      html
    });
  },

  async share(visitaId: string) {
    const { Print, Sharing } = await loadPdfNativeModules();
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (!isSharingAvailable) {
      throw new Error("El dispositivo no permite compartir archivos en este momento.");
    }

    const html = await buildVisitReportHtml(visitaId);
    const pdf = await Print.printToFileAsync({
      html
    });

    await Sharing.shareAsync(pdf.uri, {
      dialogTitle: "Compartir ficha de visita",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf"
    });
  }
};

async function loadPdfNativeModules() {
  try {
    const [Print, Sharing] = await Promise.all([
      import("expo-print"),
      import("expo-sharing")
    ]);

    return { Print, Sharing };
  } catch {
    throw new Error(
      "La version instalada de la app aun no incluye el modulo nativo para PDF. Actualiza la app desde una nueva compilacion para usar esta funcion."
    );
  }
}

async function buildVisitReportHtml(visitaId: string) {
  const detail = await visitasCampoService.getFullDetail(visitaId);
  const { visita } = detail;
  const parcela = parcelasRepository.getById(visita.parcelaId);
  const productor = parcela ? productoresRepository.getById(parcela.productorId) : null;
  const iconUri = await getReportIconUri();

  const cultivos = visitasCampoRepository.getCultivos();
  const variedades = visitasCampoRepository.getVariedadesByCultivo(visita.cropId);
  const etapas = visitasCampoRepository.getEtapasFenologicasByCultivo(visita.cropId);
  const subEtapas = visita.phenologicalStageId
    ? visitasCampoRepository.getSubEtapasByEtapaFenologica(visita.phenologicalStageId)
    : [];
  const pestDiseases =
    observacionesSanitariasRepository.getPestDiseasesByPhenologicalStage(
      visita.phenologicalStageId ?? ""
    );
  const incidenceLevels = observacionesSanitariasRepository.getIncidenceLevels();
  const tiposRiego = riegosRepository.getTiposRiego();
  const labores = laboresCulturalesVisitaRepository.getLaboresCulturales();
  const stepNotes = new Map(
    detail.stepNotes.map((stepNote) => [stepNote.stepNumber, stepNote])
  );

  const producerName = formatPersonName(productor?.firstName, productor?.lastName);
  const producerFirstName = getFirstName(productor?.firstName, productor?.lastName);
  const documentTitle = `Visita ${producerFirstName} ${formatDate(visita.visitDate)}`;
  const levelDescriptions: Record<string, string | null> = {};
  for (const pest of pestDiseases) {
    for (const rel of pest.stageLevels) {
      levelDescriptions[`${pest.id}:${rel.nivelIncidenciaSeveridadId}`] = rel.description;
      levelDescriptions[rel.nivelIncidenciaSeveridadId] = rel.description;
    }
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documentTitle)}</title>
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
      .logo {
        width: 54px;
        height: 54px;
        object-fit: contain;
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
      .muted {
        color: #53635a;
      }
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
      ${iconUri ? `<img class="logo" src="${escapeAttribute(iconUri)}" />` : ""}
      <div class="header-copy">
        <h1 class="document-title">Ficha de Visita de campo</h1>
        <p class="subtitle">Reporte generado por Agrogest VSM</p>
      </div>
    </header>

    <div class="visit-title">${escapeHtml(documentTitle)}</div>
    <div class="meta">Generado localmente desde la aplicacion movil.</div>

    ${renderSection(
      "Paso 1 - Datos generales",
      renderFields([
        ["Agricultor", producerName],
        ["Parcela", parcela?.name ?? visita.parcelaId],
        ["Area parcela", parcela?.areaHectares ? `${parcela.areaHectares} ha` : null],
        ["Fecha visita", formatDate(visita.visitDate)],
        ["Horario", formatTimeRange(visita.startVisitTime, visita.endVisitTime)],
        ["Cultivo", findById(cultivos, visita.cropId)?.name ?? visita.cropId],
        ["Variedad", findById(variedades, visita.varietyId)?.name ?? visita.varietyId],
        ["Fecha siembra", formatDate(visita.sowingDate)],
        ["Plantas", visita.plantsCount === null ? null : String(visita.plantsCount)],
        ["Area visita", visita.areaHectares ? `${visita.areaHectares} ha` : null],
        [
          "Etapa fenologica",
          visita.phenologicalStageId
            ? (findById(etapas, visita.phenologicalStageId)?.name ??
              visita.phenologicalStageId)
            : null
        ],
        [
          "Sub etapa",
          visita.subEtapaId
            ? (findById(subEtapas, visita.subEtapaId)?.name ?? visita.subEtapaId)
            : null
        ],
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
      "Paso 2 - Plagas y enfermedades",
      renderSanitaryObservations(
        detail.observacionesSanitarias,
        pestDiseases,
        incidenceLevels,
        levelDescriptions
      ) + renderStepNote(stepNotes.get(2))
    )}

    ${renderSection(
      "Paso 3 - Nutricion",
      renderNutrition(detail.evaluaciones) + renderStepNote(stepNotes.get(3))
    )}

    ${renderSection(
      "Paso 4 - Riego",
      renderRiego(detail.riego, tiposRiego) + renderStepNote(stepNotes.get(4))
    )}

    ${renderSection(
      "Paso 5 - Labores culturales",
      renderCulturalLabors(detail.laboresCulturales, labores) +
        renderStepNote(stepNotes.get(5))
    )}

    <div class="footer">
      Este reporte omite la ubicacion de la visita y se genera con la informacion guardada localmente en el dispositivo.
    </div>
  </body>
</html>`;
}

async function getReportIconUri() {
  try {
    const [{ Asset }, FileSystem] = await Promise.all([
      import("expo-asset"),
      import("expo-file-system/legacy")
    ]);
    const reportIcon = getReportIconModule();

    if (!reportIcon) {
      return null;
    }

    const asset = Asset.fromModule(reportIcon);
    await asset.downloadAsync();
    const assetUri = asset.localUri ?? asset.uri ?? null;

    if (!assetUri) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(assetUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

function getReportIconModule() {
  if (typeof process !== "undefined" && process.env?.VITEST) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../../../../assets/images/adaptive_icon_vsm.png");
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
  observations: Array<{
    pestDiseaseId: string;
    incidenceLevelId: string | null;
    severityLevelId: string | null;
    incidencePercentage: string | null;
    observation: string | null;
    organosAfectados: string[];
  }>,
  pestDiseases: Array<{ id: string; name: string; type: string }>,
  incidenceLevels: Array<{ id: string; name: string }>,
  levelDescriptions: Record<string, string | null>
) {
  if (observations.length === 0) {
    return `<div class="empty">No hay plagas o enfermedades registradas.</div>`;
  }

  return `<ul class="list">${observations
    .map((observation) => {
      const pestDisease = findById(pestDiseases, observation.pestDiseaseId);
      const incidence = observation.incidenceLevelId
        ? findById(incidenceLevels, observation.incidenceLevelId)?.name
        : null;
      const severity = observation.severityLevelId
        ? findById(incidenceLevels, observation.severityLevelId)?.name
        : null;
      const incidenceDesc = observation.incidenceLevelId
        ? getLevelDescription(
            levelDescriptions,
            observation.pestDiseaseId,
            observation.incidenceLevelId
          )
        : null;
      const severityDesc = observation.severityLevelId
        ? getLevelDescription(
            levelDescriptions,
            observation.pestDiseaseId,
            observation.severityLevelId
          )
        : null;

      const descParts: string[] = [];
      if (incidence && incidenceDesc) {
        descParts.push(`Incidencia ${incidence}: ${incidenceDesc}`);
      } else if (incidence) {
        descParts.push(`Incidencia: ${incidence}`);
      }
      if (severity && severityDesc) {
        descParts.push(`Severidad ${severity}: ${severityDesc}`);
      } else if (severity) {
        descParts.push(`Severidad: ${severity}`);
      }
      if (observation.incidencePercentage) {
        descParts.push(
          `% arboles enfermos: ${formatPercentValue(observation.incidencePercentage)}`
        );
      }

      return `<li>
        <span class="item-title">${escapeHtml(pestDisease?.name ?? observation.pestDiseaseId)}</span>
        <span class="muted">${escapeHtml(
          [
            pestDisease?.type,
            ...descParts,
            observation.organosAfectados.length > 0
              ? `Organos: ${observation.organosAfectados
                  .map(formatOrganoLabel)
                  .join(", ")}`
              : "Organos: No registrados"
          ]
            .filter(Boolean)
            .join(" | ") || "Sin nivel registrado"
        )}</span>
        ${observation.observation ? `<div>${escapeHtml(observation.observation)}</div>` : ""}
      </li>`;
    })
    .join("")}</ul>`;
}

function renderNutrition(
  evaluations: Array<{
    order: number;
    description: string;
    incidencePercentage: string | null;
    percentage: string | null;
    organosAfectados: string[];
  }>
) {
  if (evaluations.length === 0) {
    return `<div class="empty">No hay datos de nutricion registrados.</div>`;
  }

  return `<ul class="list">${evaluations
    .map((evaluation) => {
      const details = [
        evaluation.incidencePercentage
          ? `Incidencia: ${formatPercentValue(evaluation.incidencePercentage)}`
          : null,
        evaluation.percentage
          ? `Severidad: ${formatPercentValue(evaluation.percentage)}`
          : null,
        evaluation.organosAfectados.length > 0
          ? `Organos: ${evaluation.organosAfectados.map(formatOrganoLabel).join(", ")}`
          : "Organos: No registrados"
      ].filter(Boolean);

      return `<li>
        <span class="item-title">${escapeHtml(evaluation.description)}</span>
        <span class="muted">${escapeHtml(details.join(" | ") || "Sin detalle registrado")}</span>
      </li>`;
    })
    .join("")}</ul>`;
}

function renderRiego(
  riego: {
    tipoRiegoId: string;
    fuenteAgua: keyof typeof FUENTE_AGUA_LABELS | null;
    tipoSuelo: keyof typeof TIPO_SUELO_LABELS | null;
    humedadSuelo: keyof typeof HUMEDAD_SUELO_LABELS | null;
    estresHidrico: boolean | null;
  } | null,
  tiposRiego: Array<{ id: string; name: string; description: string | null }>
) {
  if (!riego) {
    return `<div class="empty">No hay informacion de riego registrada.</div>`;
  }

  const tipoRiego = findById(tiposRiego, riego.tipoRiegoId);
  const tipoRiegoLabel = tipoRiego
    ? appendDescription(tipoRiego.name, tipoRiego.description)
    : `Tipo registrado: ${riego.tipoRiegoId}`;

  return renderFields([
    ["Tipo de riego", tipoRiegoLabel, true],
    [
      "Fuente de agua",
      riego.fuenteAgua
        ? (FUENTE_AGUA_LABELS[riego.fuenteAgua] ?? riego.fuenteAgua)
        : "No registrada",
      true
    ],
    [
      "Tipo de suelo",
      riego.tipoSuelo
        ? (TIPO_SUELO_LABELS[riego.tipoSuelo] ?? riego.tipoSuelo)
        : "No registrado",
      true
    ],
    [
      "Humedad del suelo",
      riego.humedadSuelo
        ? (HUMEDAD_SUELO_LABELS[riego.humedadSuelo] ?? riego.humedadSuelo)
        : "No registrada",
      true
    ],
    [
      "Estres hidrico intencional",
      riego.estresHidrico === null ? "No registrado" : riego.estresHidrico ? "Si" : "No",
      true
    ]
  ]);
}

function renderCulturalLabors(
  selectedLabors: Array<{ laborCulturalId: string }>,
  catalog: Array<{
    id: string;
    name: string;
    description: string | null;
    categoryName?: string | null;
    optionLabel?: string | null;
    legend?: string | null;
    sortOrder?: number | null;
  }>
) {
  if (selectedLabors.length === 0) {
    return `<div class="empty">No hay labores culturales registradas.</div>`;
  }

  const items = selectedLabors
    .map((selectedLabor) => {
      const labor = findById(catalog, selectedLabor.laborCulturalId);

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
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.category.localeCompare(right.category)
    );

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

function appendDescription(label: string, description: string | null | undefined) {
  return description ? `${label} (${description})` : label;
}

function renderStepNote(
  note:
    | {
        observation: string | null;
        recommendation: string | null;
      }
    | null
    | undefined
) {
  if (!note?.observation && !note?.recommendation) {
    return "";
  }

  return `<div style="margin-top: 8px;">${renderFields([
    ["Observacion del paso", note.observation, true],
    ["Recomendacion del paso", note.recommendation, true]
  ])}</div>`;
}

function findById<T extends { id: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id) ?? null;
}

function getLevelDescription(
  descriptions: Record<string, string | null>,
  pestDiseaseId: string,
  levelId: string
) {
  return descriptions[`${pestDiseaseId}:${levelId}`] ?? descriptions[levelId] ?? null;
}

function formatPersonName(firstName?: string | null, lastName?: string | null) {
  const value = [firstName, lastName].filter(Boolean).join(" ").trim();
  return value || "No registrado";
}

function getFirstName(firstName?: string | null, lastName?: string | null) {
  const value = firstName?.trim() || lastName?.trim().split(/\s+/)[0] || "Agricultor";
  return value;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No registrado";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) {
    return "No registrado";
  }

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
}

function formatPercentValue(value: string | number) {
  const text = String(value).trim();
  return text.endsWith("%") ? text : `${text}%`;
}

function formatOrganoLabel(value: string) {
  const labels: Record<string, string> = {
    tronco_rama: "Tronco/rama",
    yema_apical: "Yema apical",
    brote_vegetativo: "Brote vegetativo",
    hoja: "Hoja tierna",
    hoja_tierna: "Hoja tierna",
    hoja_madura: "Hoja madura",
    panicula_floral: "Panícula floral",
    flor_individual: "Flor individual",
    fruto_recien_cuajado: "Fruto recién cuajado",
    fruto_verde: "Fruto verde",
    fruto_maduro: "Fruto maduro",
    raices: "Raices"
  };

  if (labels[value]) {
    return labels[value];
  }

  switch (value) {
    case "tronco_rama":
      return "Tronco/rama";
    case "yema_apical":
      return "Yema apical";
    case "brote_vegetativo":
      return "Brote vegetativo";
    case "hoja":
      return "Hoja tierna";
    case "hoja_tierna":
      return "Hoja tierna";
    case "hoja_madura":
      return "Hoja madura";
    case "panicula_floral":
      return "Panícula floral";
    case "flor_individual":
      return "Flor individual";
    case "fruto_recien_cuajado":
      return "Fruto recién cuajado";
    case "fruto_verde":
      return "Fruto verde";
    case "fruto_maduro":
      return "Fruto maduro";
    case "raices":
      return "Raices";
    default:
      return value;
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

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
