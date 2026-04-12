"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { toApiError } from "../../../shared/services";
import { buildAdminMapHref } from "../../mapas/utils/map-query";
import { visitasService } from "../services/visitas.service";
import type {
  ApplicationFrequencyLookupItem,
  IncidenceLevelLookupItem,
  PestDiseaseLookupItem,
  ProductLookupItem,
  RecommendationTypeLookupItem,
  VisitaDetailData
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
  const recommendationTypeMap = useMemo(
    () => createLookupMap(detail?.lookups.recommendationTypes ?? []),
    [detail?.lookups.recommendationTypes]
  );
  const productMap = useMemo(
    () => createLookupMap(detail?.lookups.products ?? []),
    [detail?.lookups.products]
  );
  const applicationFrequencyMap = useMemo(
    () => createLookupMap(detail?.lookups.applicationFrequencies ?? []),
    [detail?.lookups.applicationFrequencies]
  );

  if (isLoading) {
    return <LoadingState description="Cargando cabecera y detalle completo de la visita." />;
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
    return null;
  }

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
            <span>Campania</span>
            <strong>
              {detail.lookups.campaign
                ? detail.lookups.campaign.name
                : `Campania #${detail.visita.campaignId}`}
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

        <article className="panel">
          <p className="eyebrow">Recomendaciones</p>
          <h2 className="title title--section">
            {detail.recomendaciones.length} registro
            {detail.recomendaciones.length === 1 ? "" : "s"}
          </h2>
          {detail.recomendaciones.length === 0 ? (
            <p className="body-copy">La visita no tiene recomendaciones registradas.</p>
          ) : (
            <ul className="feature-list">
              {detail.recomendaciones.map((recomendacion) => (
                <li className="feature-item" key={recomendacion.id}>
                  <strong>
                    {recommendationTypeMap.get(recomendacion.recommendationTypeId) ??
                      `Tipo #${recomendacion.recommendationTypeId}`}
                  </strong>
                  <span>{recomendacion.detail || "Sin detalle."}</span>
                  <span>{recomendacion.applies ? "Aplica" : "No aplica"}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Productos recomendados</p>
          <h2 className="title title--section">
            {detail.productosRecomendados.length} registro
            {detail.productosRecomendados.length === 1 ? "" : "s"}
          </h2>
          {detail.productosRecomendados.length === 0 ? (
            <p className="body-copy">La visita no tiene productos recomendados.</p>
          ) : (
            <ul className="feature-list">
              {detail.productosRecomendados.map((producto) => (
                <li className="feature-item" key={producto.id}>
                  <strong>
                    {productMap.get(producto.productId) ?? `Producto #${producto.productId}`}
                  </strong>
                  <span>Dosis: {producto.dose}</span>
                  <span>
                    {producto.applicationFrequencyId
                      ? applicationFrequencyMap.get(producto.applicationFrequencyId) ??
                        `Frecuencia #${producto.applicationFrequencyId}`
                      : "Sin frecuencia"}
                  </span>
                  <span>{producto.instructions || "Sin instrucciones."}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
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
  items:
    | PestDiseaseLookupItem[]
    | IncidenceLevelLookupItem[]
    | RecommendationTypeLookupItem[]
    | ProductLookupItem[]
    | ApplicationFrequencyLookupItem[]
) {
  return new Map(items.map((item) => [item.id, item.name]));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium"
  }).format(new Date(value));
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
