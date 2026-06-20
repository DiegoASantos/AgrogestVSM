"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ErrorState } from "../../../shared/components/error-state";
import { DetailSkeleton } from "../../../shared/components/skeleton";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { formatDateOnly } from "../../../shared/utils/date-only";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { visitasService } from "../services/visitas.service";
import type {
  IncidenceLevelLookupItem,
  PestDiseaseLookupItem,
  VisitaDetailData,
  VisitaLaborCultural
} from "../types/visitas.types";

type VisitaDetailScreenProps = {
  visitaId: string;
};

export function VisitaDetailScreen({ visitaId }: VisitaDetailScreenProps) {
  const { session, logout } = useAuthSession();
  const [detail, setDetail] = useState<VisitaDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const laboresCulturales = detail.laboresCulturales ?? [];

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <button className="ui-button ui-button--ghost" onClick={loadDetail} type="button">
                Recargar detalle
              </button>
              <Link
                className="ui-button ui-button--ghost"
                href={buildAdminMapHref({
                  visitaId: detail.visita.id,
                  parcelaId: detail.visita.parcelaId,
                  campaignId: detail.visita.campaignId,
                  agronomistUserId: detail.visita.agronomistUserId
                })}
              >
                Ver en mapa
              </Link>
              <Link className="ui-button ui-button--secondary" href="/visitas">
                Volver al listado
              </Link>
            </>
          }
          description="Vista operativa completa de la visita con sus bloques registrados."
          eyebrow="Detalle de visita"
          title={detail.visita.nroFicha?.trim() || detail.visita.publicId}
        />

        <div className="visit-detail__grid">
          <div className="visit-detail__field">
            <span>Public ID</span>
            <strong>{detail.visita.publicId}</strong>
          </div>
          <div className="visit-detail__field">
            <span>Fecha de visita</span>
            <strong>{formatDate(detail.visita.visitDate)}</strong>
          </div>
          <div className="visit-detail__field">
            <span>Horario</span>
            <strong>
              {formatTime(detail.visita.startVisitTime)}
              {detail.visita.endVisitTime
                ? ` - ${formatTime(detail.visita.endVisitTime)}`
                : ""}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Cultivo</span>
            <strong>
              {detail.lookups.crop
                ? `${detail.lookups.crop.name} (${detail.lookups.crop.code})`
                : `Cultivo #${detail.visita.cropId}`}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Variedad</span>
            <strong>
              {detail.lookups.variety
                ? `${detail.lookups.variety.name} (${detail.lookups.variety.code})`
                : `Variedad #${detail.visita.varietyId}`}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Parcela</span>
            <strong>
              {detail.lookups.parcela
                ? `${detail.lookups.parcela.code}${detail.lookups.parcela.name ? ` - ${detail.lookups.parcela.name}` : ""}`
                : `Parcela #${detail.visita.parcelaId}`}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Campaña</span>
            <strong>
              {detail.lookups.campaign
                ? detail.lookups.campaign.name
                : `Campaña #${detail.visita.campaignId}`}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Agronomo</span>
            <strong>
              {detail.lookups.agronomist?.name ??
                `Usuario #${detail.visita.agronomistUserId}`}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Etapa fenologica</span>
            <strong>
              {detail.lookups.phenologicalStage
                ? detail.lookups.phenologicalStage.name
                : detail.visita.phenologicalStageId
                  ? `Etapa #${detail.visita.phenologicalStageId}`
                  : "No registrada"}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Nro plantas</span>
            <strong>{detail.visita.plantsCount ?? "No registrado"}</strong>
          </div>
          <div className="visit-detail__field">
            <span>Fecha siembra</span>
            <strong>
              {detail.visita.sowingDate ? formatDate(detail.visita.sowingDate) : "No registrada"}
            </strong>
          </div>
          <div className="visit-detail__field">
            <span>Estado</span>
            <strong>{detail.visita.isActive ? "Activa" : "Inactiva"}</strong>
          </div>
        </div>

        <div className="visit-detail__notes">
          <div className="visit-detail__note">
            <span>Observacion general</span>
            <strong>{detail.visita.generalObservation || "Sin observacion general."}</strong>
          </div>
          <div className="visit-detail__note">
            <span>Sincronizado</span>
            <strong>
              {detail.visita.synchronizedAt
                ? formatDateTime(detail.visita.synchronizedAt)
                : "Sincronizacion no registrada"}
            </strong>
          </div>
        </div>
      </article>

      <div className="panel-grid panel-grid--two">
        <article className="panel">
          <p className="eyebrow">Evaluaciones</p>
          <h2 className="title title--section">
            {detail.evaluaciones.length} registro{detail.evaluaciones.length === 1 ? "" : "s"}
          </h2>
          {detail.evaluaciones.length === 0 ? (
            <p className="body-copy">La visita no tiene evaluaciones registradas.</p>
          ) : (
            <ul className="feature-list">
              {detail.evaluaciones.map((evaluacion) => (
                <li className="feature-item" key={evaluacion.id}>
                  <strong>Orden {evaluacion.order}</strong>
                  <span>
                    {evaluacion.description}
                    {evaluacion.percentage !== null
                      ? ` - ${evaluacion.percentage}%`
                      : " - Sin porcentaje"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Observaciones sanitarias</p>
          <h2 className="title title--section">
            {detail.observacionesSanitarias.length} registro
            {detail.observacionesSanitarias.length === 1 ? "" : "s"}
          </h2>
          {detail.observacionesSanitarias.length === 0 ? (
            <p className="body-copy">La visita no tiene observaciones sanitarias.</p>
          ) : (
            <ul className="feature-list">
              {detail.observacionesSanitarias.map((observacion) => (
                <li className="feature-item" key={observacion.id}>
                  <strong>
                    {pestDiseaseMap.get(observacion.pestDiseaseId) ??
                      `Plaga #${observacion.pestDiseaseId}`}
                    {observacion.incidenceLevelId
                      ? ` - ${incidenceLevelMap.get(observacion.incidenceLevelId) ?? `Nivel #${observacion.incidenceLevelId}`}`
                      : ""}
                  </strong>
                  <span>{observacion.observation}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel">
        <p className="eyebrow">Paso 5</p>
        <h2 className="title title--section">Labores culturales</h2>
        {laboresCulturales.length === 0 ? (
          <p className="body-copy">La visita no tiene labores culturales registradas.</p>
        ) : (
          <ul className="feature-list">
            {groupLaboresCulturales(laboresCulturales).map((item) => (
              <li className="feature-item" key={item.category}>
                <strong>{item.category}</strong>
                <span>
                  {item.option}
                  {item.legend ? ` (${item.legend})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
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
}

function createLookupMap(
  items: PestDiseaseLookupItem[] | IncidenceLevelLookupItem[]
) {
  return new Map(items.map((item) => [item.id, item.name]));
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

function formatTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 5);
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
