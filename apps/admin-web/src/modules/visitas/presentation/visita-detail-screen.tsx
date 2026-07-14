"use client";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Download,
  Droplets,
  FileText,
  Leaf,
  MapPin,
  ShieldAlert,
  Sprout,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ErrorState } from "../../../shared/components/error-state";
import { DetailSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { formatDateOnly } from "../../../shared/utils/date-only";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import {
  createPrintablePdfWindow,
  openDiagnosticPdf,
  openRecipePdf,
  showPrintablePdfError
} from "../services/visita-pdf-web.service";
import { visitasService } from "../services/visitas.service";
import type {
  IncidenceLevelLookupItem,
  PestDiseaseLookupItem,
  VisitaCalificacion,
  VisitaDetailData,
  VisitaLaborCultural,
  VisitaObservacionSanitaria
} from "../types/visitas.types";

type VisitaDetailScreenProps = {
  visitaId: string;
};

type PdfAction = "diagnostico" | "receta";

export function VisitaDetailScreen({ visitaId }: VisitaDetailScreenProps) {
  const { session, logout } = useAuthSession();
  const [detail, setDetail] = useState<VisitaDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const [activePdfAction, setActivePdfAction] = useState<PdfAction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadDetail();
  }, [session, visitaId]);

  const pestDiseaseMap = useMemo(
    () => createLookupMap(detail?.lookups.pestDiseases ?? []),
    [detail?.lookups.pestDiseases]
  );
  const incidenceLevelMap = useMemo(
    () => createLookupMap(detail?.lookups.incidenceLevels ?? []),
    [detail?.lookups.incidenceLevels]
  );
  const tipoRiegoMap = useMemo(
    () => new Map((detail?.lookups.tiposRiego ?? []).map((item) => [item.id, item])),
    [detail?.lookups.tiposRiego]
  );

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        action={
          <button className="ui-button ui-button--secondary" onClick={loadDetail} type="button">
            Reintentar
          </button>
        }
        description={errorMessage}
      />
    );
  }

  if (!detail) {
    return (
      <ErrorState
        title="No se pudo cargar el detalle"
        description="La visita solicitada no existe o no se encuentra disponible."
      />
    );
  }

  const plagas = detail.observacionesSanitarias.filter(
    (observacion) => pestDiseaseMap.get(observacion.pestDiseaseId)?.type === "plaga"
  );
  const enfermedades = detail.observacionesSanitarias.filter(
    (observacion) =>
      pestDiseaseMap.get(observacion.pestDiseaseId)?.type === "enfermedad"
  );
  const laboresCulturales = groupLaboresCulturales(detail.laboresCulturales);
  const scoreAverage = resolveScoreAverage(detail.calificaciones);

  return (
    <section className="panel-grid">
      <article className="panel visit-dossier">
        <ToolbarActions
          actions={
            <>
              <Link
                className="ui-button ui-button--ghost"
                href={buildAdminMapHref({
                  visitaId: detail.visita.id,
                  parcelaId: detail.visita.parcelaId,
                  campaignId: detail.visita.campaignId,
                  agronomistUserId: detail.visita.agronomistUserId
                })}
              >
                <MapPin aria-hidden="true" size={16} />
                Ver en mapa
              </Link>
              <Link className="ui-button ui-button--secondary" href="/visitas">
                <ArrowLeft aria-hidden="true" size={16} />
                Volver
              </Link>
            </>
          }
          description="Ficha unificada de la visita, hallazgos, cumplimiento y reportes."
          eyebrow="Detalle de visita"
          title={detail.visita.nroFicha?.trim() || detail.visita.publicId}
        />

        <div className="visit-dossier__hero">
          <div className="visit-dossier__identity">
            <span className={detail.visita.isActive ? "visit-status" : "visit-status visit-status--muted"}>
              {detail.visita.isActive ? "Activa" : "Inactiva"}
            </span>
            <h2>{formatParcela(detail)}</h2>
            <p>
              {formatCodeName(detail.lookups.crop, detail.visita.cropId)} ·{" "}
              {detail.lookups.campaign?.name ?? `Campaña #${detail.visita.campaignId}`}
            </p>
          </div>

          <div className="visit-dossier__pdf-actions">
            <button
              className="ui-button ui-button--primary"
              disabled={activePdfAction !== null}
              onClick={() => void handlePdfAction("diagnostico")}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              {activePdfAction === "diagnostico" ? "Preparando..." : "PDF diagnostico"}
            </button>
            <button
              className="ui-button ui-button--secondary"
              disabled={activePdfAction !== null}
              onClick={() => void handlePdfAction("receta")}
              type="button"
            >
              <FileText aria-hidden="true" size={16} />
              {activePdfAction === "receta" ? "Preparando..." : "PDF receta"}
            </button>
          </div>
        </div>

        {pdfErrorMessage ? (
          <div className="visit-dossier__alert" role="alert">
            {pdfErrorMessage}
          </div>
        ) : null}

        <div className="visit-dossier__facts" aria-label="Resumen de datos basicos">
          <FactCard
            icon={<CalendarDays aria-hidden="true" size={18} />}
            label="Fecha y horario"
            value={`${formatDate(detail.visita.visitDate)} · ${formatTimeRange(
              detail.visita.startVisitTime,
              detail.visita.endVisitTime
            )}`}
          />
          <FactCard
            icon={<Sprout aria-hidden="true" size={18} />}
            label="Fenologia"
            value={detail.lookups.phenologicalStage?.name ?? "No registrada"}
          />
          <FactCard
            icon={<Leaf aria-hidden="true" size={18} />}
            label="Cultivo / variedad"
            value={`${formatCodeName(detail.lookups.crop, detail.visita.cropId)} · ${formatCodeName(
              detail.lookups.variety,
              detail.visita.varietyId
            )}`}
          />
          <FactCard
            icon={<ClipboardCheck aria-hidden="true" size={18} />}
            label="Cumplimiento"
            value={scoreAverage === null ? "Sin calificacion" : `${scoreAverage.toFixed(1)} / 3`}
          />
        </div>

        <div className="visit-dossier__body">
          <div className="visit-dossier__column visit-dossier__column--main">
            <div className="visit-dossier__block">
              <div className="visit-dossier__block-header">
                <span>Datos de campo</span>
              </div>
              <div className="visit-dossier__compact-grid">
                <DetailPill label="Public ID" value={detail.visita.publicId} />
                <DetailPill
                  label="Agronomo"
                  value={
                    detail.lookups.agronomist?.name ??
                    `Usuario #${detail.visita.agronomistUserId}`
                  }
                />
                <DetailPill
                  label="Nro plantas"
                  value={detail.visita.plantsCount ?? "No registrado"}
                />
                <DetailPill
                  label="Area"
                  value={
                    detail.visita.areaHectares
                      ? `${detail.visita.areaHectares} ha`
                      : "No registrada"
                  }
                />
                <DetailPill
                  label="Fecha siembra"
                  value={
                    detail.visita.sowingDate
                      ? formatDate(detail.visita.sowingDate)
                      : "No registrada"
                  }
                />
                <DetailPill
                  label="Sincronizado"
                  value={
                    detail.visita.synchronizedAt
                      ? formatDateTime(detail.visita.synchronizedAt)
                      : "Sin registro"
                  }
                />
              </div>
              <div className="visit-dossier__note">
                <span>Observacion general</span>
                <p>{detail.visita.generalObservation || "Sin observacion general."}</p>
              </div>
            </div>

            <ModuleGroup
              icon={<ShieldAlert aria-hidden="true" size={18} />}
              items={[
                {
                  title: "Plagas",
                  count: plagas.length,
                  content:
                    plagas.length === 0
                      ? "No hay plagas registradas."
                      : plagas
                          .map((item) =>
                            formatSanitaryItem(item, pestDiseaseMap, incidenceLevelMap)
                          )
                          .join(" · ")
                },
                {
                  title: "Enfermedades",
                  count: enfermedades.length,
                  content:
                    enfermedades.length === 0
                      ? "No hay enfermedades registradas."
                      : enfermedades
                          .map((item) =>
                            formatSanitaryItem(item, pestDiseaseMap, incidenceLevelMap)
                          )
                          .join(" · ")
                }
              ]}
              title="Sanidad"
            />

            <ModuleGroup
              icon={<Leaf aria-hidden="true" size={18} />}
              items={[
                {
                  title: "Nutricion",
                  count: detail.evaluaciones.length,
                  content:
                    detail.evaluaciones.length === 0
                      ? "No hay evaluaciones nutricionales."
                      : detail.evaluaciones
                          .map((item) => formatNutritionItem(item.description, item.percentage))
                          .join(" · ")
                }
              ]}
              title="Nutricion"
            />
          </div>

          <div className="visit-dossier__column visit-dossier__column--side">
            <ModuleGroup
              icon={<Droplets aria-hidden="true" size={18} />}
              items={[
                {
                  title: "Riego",
                  count: detail.riego ? 1 : 0,
                  content: detail.riego
                    ? [
                        tipoRiegoMap.get(detail.riego.tipoRiegoId)?.name ??
                          `Tipo #${detail.riego.tipoRiegoId}`,
                        `Fuente: ${formatCatalogValue(detail.riego.fuenteAgua)}`,
                        `Suelo: ${formatCatalogValue(detail.riego.tipoSuelo)}`,
                        `Humedad: ${formatCatalogValue(detail.riego.humedadSuelo)}`,
                        detail.riego.estresHidrico === null
                          ? "Estres hidrico: Sin registro"
                          : `Estres hidrico: ${detail.riego.estresHidrico ? "Si" : "No"}`
                      ].join(" · ")
                    : "No hay informacion de riego registrada."
                }
              ]}
              title="Riego"
            />

            <ModuleGroup
              icon={<Wrench aria-hidden="true" size={18} />}
              items={[
                {
                  title: "Labores culturales",
                  count: laboresCulturales.length,
                  content:
                    laboresCulturales.length === 0
                      ? "No hay labores culturales registradas."
                      : laboresCulturales
                          .map((item) =>
                            item.legend
                              ? `${item.category}: ${item.option} (${item.legend})`
                              : `${item.category}: ${item.option}`
                          )
                          .join(" · ")
                }
              ]}
              title="Labores"
            />

            <div className="visit-dossier__block">
              <div className="visit-dossier__block-header">
                <span>Calificacion por modulo</span>
              </div>
              {detail.calificaciones.length === 0 ? (
                <p className="visit-dossier__empty">Sin calificaciones registradas.</p>
              ) : (
                <div className="visit-score-list">
                  {sortCalificaciones(detail.calificaciones).map((calificacion) => (
                    <div className="visit-score" key={calificacion.id}>
                      <span>{getModuloLabel(calificacion.modulo)}</span>
                      <strong>{calificacion.puntaje}/3</strong>
                      <small>
                        {calificacion.observacion ||
                          getScoreDescription(calificacion.puntaje)}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );

  async function loadDetail() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const nextDetail = await visitasService.getFullDetail(session, visitaId);
      setDetail(nextDetail);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setErrorMessage(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePdfAction(action: PdfAction) {
    if (!session || !detail) {
      return;
    }

    const popup = createPrintablePdfWindow();

    try {
      setActivePdfAction(action);
      setPdfErrorMessage(null);

      if (action === "diagnostico") {
        openDiagnosticPdf(detail, popup);
        return;
      }

      const [receta, consolidacion] = await Promise.all([
        visitasService.getRecetaByVisitaId(session, detail.visita.id),
        visitasService.getRecetaConsolidacion(session, detail.visita.id)
      ]);

      openRecipePdf(detail, receta, consolidacion, popup);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        showPrintablePdfError(popup, "Tu sesion expiro. Inicia sesion nuevamente.");
        logout();
        return;
      }

      const message = apiError.message || "No se pudo preparar el PDF.";
      showPrintablePdfError(popup, message);
      setPdfErrorMessage(message);
    } finally {
      setActivePdfAction(null);
    }
  }
}

function FactCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="visit-fact">
      <span className="visit-fact__icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="visit-detail-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ModuleGroup({
  icon,
  items,
  title
}: {
  icon: React.ReactNode;
  items: Array<{ title: string; count: number; content: string }>;
  title: string;
}) {
  return (
    <div className="visit-dossier__block">
      <div className="visit-dossier__block-header">
        <span className="visit-dossier__block-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="visit-module-list">
        {items.map((item) => (
          <div className="visit-module-item" key={item.title}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.content}</p>
            </div>
            <span className={item.count > 0 ? "visit-count" : "visit-count visit-count--muted"}>
              {item.count > 0 ? "Con registro" : "Sin registro"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function createLookupMap<T extends { id: string }>(items: T[]) {
  return new Map<string, T>(items.map((item) => [item.id, item]));
}

function formatDate(value: string) {
  return formatDateOnly(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) {
    return "No registrado";
  }

  return end ? `${start.slice(0, 5)} - ${end.slice(0, 5)}` : start.slice(0, 5);
}

function formatParcela(detail: VisitaDetailData) {
  const parcela = detail.lookups.parcela;

  if (!parcela) {
    return `Parcela #${detail.visita.parcelaId}`;
  }

  return `${parcela.code}${parcela.name ? ` - ${parcela.name}` : ""}`;
}

function formatCodeName(item: { name: string; code?: string } | null, fallback: string) {
  if (!item) {
    return fallback;
  }

  return item.code ? `${item.name} (${item.code})` : item.name;
}

function formatSanitaryItem(
  observacion: VisitaObservacionSanitaria,
  pestDiseaseMap: Map<string, PestDiseaseLookupItem>,
  incidenceLevelMap: Map<string, IncidenceLevelLookupItem>
) {
  const pestDisease = pestDiseaseMap.get(observacion.pestDiseaseId);
  const incidence = observacion.incidenceLevelId
    ? incidenceLevelMap.get(observacion.incidenceLevelId)?.name
    : null;
  const severity = observacion.severityLevelId
    ? incidenceLevelMap.get(observacion.severityLevelId)?.name
    : null;
  const details = [
    incidence ? `Incidencia ${incidence}` : null,
    severity ? `Severidad ${severity}` : null,
    observacion.incidencePercentage ? `${observacion.incidencePercentage}%` : null
  ].filter(Boolean);

  return `${pestDisease?.name ?? `ID ${observacion.pestDiseaseId}`}${
    details.length > 0 ? ` (${details.join(", ")})` : ""
  }`;
}

function formatNutritionItem(description: string, percentage: number | null) {
  return percentage === null ? description : `${description} (${percentage}%)`;
}

function formatCatalogValue(value: string | null | undefined) {
  if (!value) {
    return "No registrado";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupLaboresCulturales(labores: VisitaLaborCultural[]) {
  return labores
    .map((labor) => {
      const catalog = labor.laborCultural;

      return {
        category: catalog?.categoryName ?? "Labores culturales",
        option: catalog?.optionLabel ?? catalog?.name ?? `Labor #${labor.laborCulturalId}`,
        legend: catalog?.legend ?? catalog?.description ?? null,
        sortOrder: catalog?.sortOrder ?? 9999
      };
    })
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.category.localeCompare(right.category)
    );
}

const MODULO_ORDER = ["plagas", "enfermedades", "nutricion", "riego", "labores"];

function sortCalificaciones(calificaciones: VisitaCalificacion[]) {
  return [...calificaciones].sort(
    (left, right) =>
      MODULO_ORDER.indexOf(left.modulo) - MODULO_ORDER.indexOf(right.modulo)
  );
}

function resolveScoreAverage(calificaciones: VisitaCalificacion[]) {
  if (calificaciones.length === 0) {
    return null;
  }

  return (
    calificaciones.reduce((total, calificacion) => total + calificacion.puntaje, 0) /
    calificaciones.length
  );
}

function getModuloLabel(modulo: VisitaCalificacion["modulo"]) {
  const labels: Record<VisitaCalificacion["modulo"], string> = {
    plagas: "Plagas",
    enfermedades: "Enfermedades",
    nutricion: "Nutricion",
    riego: "Riego",
    labores: "Labores"
  };

  return labels[modulo];
}

function getScoreDescription(puntaje: number) {
  if (puntaje === 0) return "Incumplimiento critico";
  if (puntaje === 1) return "Cumplimiento deficiente";
  if (puntaje === 2) return "Cumplimiento parcial";
  return "Cumplimiento optimo";
}
