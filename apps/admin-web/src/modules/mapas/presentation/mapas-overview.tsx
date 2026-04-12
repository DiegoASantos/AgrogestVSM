"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { ActionLink } from "../../../shared/components/action-link";
import {
  AdminMap,
  type AdminMapPoint,
  type AdminMapPolygon
} from "../../../shared/components/admin-map";
import { ErrorState } from "../../../shared/components/error-state";
import { FilterBar } from "../../../shared/components/filter-bar";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { mapasService } from "../services/mapas.service";
import type {
  MapasOverviewData,
  ParcelaMapItem,
  SelectedMapFeature,
  VisitaMapItem
} from "../types/mapas.types";
import {
  buildAdminMapHref,
  emptyAdminMapFilters,
  readAdminMapQuery,
  type AdminMapFilterState
} from "../utils/map-query";

const PARCELA_POLYGON_COLOR = "#15803d";
const PARCELA_POLYGON_FILL = "#bbf7d0";
const PARCELA_POINT_COLOR = "#166534";
const VISITA_POINT_COLOR = "#b45309";
const MISSING_GEODATA_PREVIEW_LIMIT = 6;

type SelectOption = {
  value: string;
  label: string;
};

export function MapasOverview() {
  const { session, logout } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [overviewData, setOverviewData] = useState<MapasOverviewData | null>(null);
  const [draftFilters, setDraftFilters] = useState(emptyAdminMapFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyAdminMapFilters);
  const [requestedVisitaId, setRequestedVisitaId] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<SelectedMapFeature | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadOverview();
  }, [session]);

  useEffect(() => {
    const query = readAdminMapQuery(new URLSearchParams(searchParamsKey));
    setDraftFilters(query.filters);
    setAppliedFilters(query.filters);
    setRequestedVisitaId(query.selection.visitaId);
    setValidationError(null);
  }, [searchParamsKey]);

  const parcelas = overviewData?.parcelas.items ?? [];
  const visitas = overviewData?.visitas.items ?? [];
  const filteredVisitas = useMemo(
    () => filterVisitas(visitas, appliedFilters),
    [appliedFilters, visitas]
  );
  const filteredParcelas = useMemo(() => {
    let nextItems = filterParcelas(parcelas, appliedFilters);

    if (requestedVisitaId) {
      const selectedVisita = filteredVisitas.find(
        (item) => item.id === requestedVisitaId
      );

      if (selectedVisita) {
        return nextItems.filter((item) => item.id === selectedVisita.parcelaId);
      }
    }

    if (hasVisitFilters(appliedFilters)) {
      const parcelaIds = new Set(filteredVisitas.map((item) => item.parcelaId));
      nextItems = nextItems.filter((item) => parcelaIds.has(item.id));
    }

    return nextItems;
  }, [appliedFilters, filteredVisitas, parcelas, requestedVisitaId]);

  useEffect(() => {
    const nextSelection = resolveSelectedFeature(
      selectedFeature,
      requestedVisitaId,
      filteredVisitas,
      filteredParcelas
    );

    if (!sameSelection(selectedFeature, nextSelection)) {
      setSelectedFeature(nextSelection);
    }
  }, [filteredParcelas, filteredVisitas, requestedVisitaId, selectedFeature]);

  const selectedVisita =
    selectedFeature?.kind === "visita"
      ? (filteredVisitas.find((item) => item.id === selectedFeature.id) ?? null)
      : null;
  const selectedParcelaId =
    selectedFeature?.kind === "parcela"
      ? selectedFeature.id
      : (selectedVisita?.parcelaId ?? null);
  const selectedParcela = selectedParcelaId
    ? (filteredParcelas.find((item) => item.id === selectedParcelaId) ?? null)
    : null;
  const missingParcelas = filteredParcelas.filter((item) => !item.hasGeodata);
  const missingVisitas = filteredVisitas.filter((item) => !item.hasGeodata);
  const producerOptions = useMemo(() => buildProducerOptions(parcelas), [parcelas]);
  const sectorOptions = useMemo(
    () => buildSectorOptions(parcelas, draftFilters.productorId),
    [draftFilters.productorId, parcelas]
  );
  const parcelaOptions = useMemo(
    () => buildParcelaOptions(parcelas, draftFilters),
    [draftFilters, parcelas]
  );
  const campaignOptions = useMemo(
    () => buildCampaignOptions(visitas, draftFilters),
    [draftFilters, visitas]
  );
  const agronomistOptions = useMemo(
    () => buildAgronomistOptions(visitas, draftFilters),
    [draftFilters, visitas]
  );
  const mapPolygons = useMemo(
    () =>
      filteredParcelas
        .filter((item) => item.geometry)
        .map(
          (item) =>
            ({
              id: `parcela-polygon-${item.id}`,
              geometry: item.geometry!,
              color: PARCELA_POLYGON_COLOR,
              fillColor: PARCELA_POLYGON_FILL,
              isSelected: selectedParcelaId === item.id,
              onSelect: () => handleFeatureSelect({ kind: "parcela", id: item.id }),
              popup: {
                title: buildParcelaTitle(item),
                description: buildParcelaPopup(item)
              }
            }) satisfies AdminMapPolygon
        ),
    [filteredParcelas, selectedParcelaId]
  );
  const mapPoints = useMemo(
    () => [
      ...filteredParcelas
        .filter((item) => item.referencePoint)
        .map(
          (item) =>
            ({
              id: `parcela-point-${item.id}`,
              geometry: item.referencePoint!,
              color: PARCELA_POINT_COLOR,
              radius: 7,
              isSelected: selectedParcelaId === item.id,
              onSelect: () => handleFeatureSelect({ kind: "parcela", id: item.id }),
              popup: {
                title: buildParcelaTitle(item),
                description: buildParcelaPopup(item)
              }
            }) satisfies AdminMapPoint
        ),
      ...filteredVisitas
        .filter((item) => item.visitLocation)
        .map(
          (item) =>
            ({
              id: `visita-${item.id}`,
              geometry: item.visitLocation!,
              color: VISITA_POINT_COLOR,
              radius: 6,
              isSelected:
                selectedFeature?.kind === "visita" && selectedFeature.id === item.id,
              onSelect: () => handleFeatureSelect({ kind: "visita", id: item.id }),
              popup: {
                title: buildVisitaTitle(item),
                description: buildVisitaPopup(item)
              }
            }) satisfies AdminMapPoint
        )
    ],
    [filteredParcelas, filteredVisitas, selectedFeature]
  );

  if (isLoading) {
    return (
      <LoadingState description="Cargando parcelas, visitas y catalogos geograficos." />
    );
  }

  if (errorMessage) {
    return (
      <ErrorState
        action={
          <button
            className="ui-button ui-button--secondary"
            onClick={() => void loadOverview()}
            type="button"
          >
            Reintentar
          </button>
        }
        description={errorMessage}
      />
    );
  }

  if (!overviewData) {
    return null;
  }

  return (
    <section className="panel-grid">
      <article className="panel">
        <ToolbarActions
          actions={
            <>
              <button
                className="ui-button ui-button--ghost"
                onClick={() => void loadOverview()}
                type="button"
              >
                Recargar
              </button>
              <Link className="ui-button ui-button--secondary" href={adminRoutes.visitas}>
                Ver visitas
              </Link>
              <Link
                className="ui-button ui-button--secondary"
                href={adminRoutes.dashboard}
              >
                Volver a dashboard
              </Link>
            </>
          }
          description="Mapa administrativo con filtros simples para revisar parcelas y visitas en contexto."
          eyebrow="Mapas"
          title="Visualizacion geografica"
        />

        <FilterBar
          actions={
            <>
              <button
                className="ui-button ui-button--ghost"
                onClick={handleClearFilters}
                type="button"
              >
                Limpiar
              </button>
              <button
                className="ui-button ui-button--primary"
                onClick={handleApplyFilters}
                type="button"
              >
                Aplicar filtros
              </button>
            </>
          }
        >
          <FieldSelect
            label="Productor"
            options={producerOptions}
            value={draftFilters.productorId}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                productorId: value,
                sectorId: "",
                parcelaId: ""
              }))
            }
          />
          <FieldSelect
            label="Sector"
            options={sectorOptions}
            value={draftFilters.sectorId}
            onChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                sectorId: value,
                parcelaId: ""
              }))
            }
          />
          <FieldSelect
            label="Parcela"
            options={parcelaOptions}
            value={draftFilters.parcelaId}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, parcelaId: value }))
            }
          />
          <FieldSelect
            label="Agronomo"
            options={agronomistOptions}
            value={draftFilters.agronomistUserId}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, agronomistUserId: value }))
            }
          />
          <FieldSelect
            label="Campania"
            options={campaignOptions}
            value={draftFilters.campaignId}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, campaignId: value }))
            }
          />
          <FieldDate
            label="Fecha desde"
            value={draftFilters.startDate}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, startDate: value }))
            }
          />
          <FieldDate
            label="Fecha hasta"
            value={draftFilters.endDate}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, endDate: value }))
            }
          />
        </FilterBar>

        {validationError ? <p className="form-error">{validationError}</p> : null}

        <div className="map-overview__summary">
          <SummaryCard
            label="Parcelas visibles"
            value={String(filteredParcelas.length)}
            help={`${filteredParcelas.filter((item) => item.hasGeodata).length} con geodatos`}
          />
          <SummaryCard
            label="Visitas visibles"
            value={String(filteredVisitas.length)}
            help={`${filteredVisitas.filter((item) => item.hasGeodata).length} con ubicacion`}
          />
          <SummaryCard
            label="Parcelas sin geodatos"
            value={String(missingParcelas.length)}
            help="Se listan abajo como fallback."
          />
          <SummaryCard
            label="Visitas sin geodatos"
            value={String(missingVisitas.length)}
            help="Se listan abajo como fallback."
          />
        </div>

        <section className="map-layout" style={{ marginTop: 24 }}>
          <div className="map-layout__main">
            <div className="map-overview__map-header">
              <div>
                <p className="eyebrow">Mapa</p>
                <h3 className="title title--section">Parcelas y visitas en contexto</h3>
              </div>
              <div className="map-legend">
                <span className="map-legend__item">
                  <span className="map-legend__swatch map-legend__swatch--polygon" />
                  Parcela poligono
                </span>
                <span className="map-legend__item">
                  <span className="map-legend__swatch map-legend__swatch--point" />
                  Parcela punto
                </span>
                <span className="map-legend__item">
                  <span className="map-legend__swatch map-legend__swatch--visit" />
                  Visita
                </span>
              </div>
            </div>
            <AdminMap
              emptyMessage="No hay geodatos para los filtros actuales."
              points={mapPoints}
              polygons={mapPolygons}
            />
          </div>
          <aside className="map-layout__side">
            {selectedVisita ? (
              <SelectedVisitaPanel item={selectedVisita} />
            ) : selectedParcela ? (
              <SelectedParcelaPanel item={selectedParcela} />
            ) : (
              <div className="map-detail-card">
                <p className="eyebrow">Seleccion</p>
                <h3 className="title title--section">Sin elemento activo</h3>
                <p className="body-copy">
                  Selecciona una parcela o una visita en el mapa para revisar su contexto.
                </p>
              </div>
            )}
          </aside>
        </section>

        <section className="map-layout" style={{ marginTop: 24 }}>
          <div className="map-layout__main">
            <div className="map-detail-card">
              <p className="eyebrow">Fallback</p>
              <h3 className="title title--section">Parcelas sin datos geograficos</h3>
              <MissingList
                items={missingParcelas.map(
                  (item) => `${buildParcelaTitle(item)} | ${describeParcela(item)}`
                )}
              />
            </div>
          </div>
          <aside className="map-layout__side">
            <div className="map-detail-card">
              <p className="eyebrow">Fallback</p>
              <h3 className="title title--section">Visitas sin ubicacion</h3>
              <MissingList
                items={missingVisitas.map(
                  (item) => `${buildVisitaTitle(item)} | ${describeVisita(item)}`
                )}
              />
            </div>
          </aside>
        </section>
      </article>
    </section>
  );

  function handleApplyFilters() {
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      setValidationError("fecha_hasta debe ser mayor o igual a fecha_desde.");
      return;
    }

    setValidationError(null);
    setRequestedVisitaId("");
    setAppliedFilters(draftFilters);
    router.replace(buildAdminMapHref(draftFilters));
  }

  function handleClearFilters() {
    setValidationError(null);
    setRequestedVisitaId("");
    setSelectedFeature(null);
    setDraftFilters(emptyAdminMapFilters);
    setAppliedFilters(emptyAdminMapFilters);
    router.replace(pathname);
  }

  function handleFeatureSelect(feature: SelectedMapFeature) {
    setRequestedVisitaId("");
    setSelectedFeature(feature);
  }

  async function loadOverview() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setOverviewData(await mapasService.getOverview(session));
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

function FieldSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldDate({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function SummaryCard({
  label,
  value,
  help
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <article className="map-overview__summary-card">
      <strong>{label}</strong>
      <span>{value}</span>
      <span>{help}</span>
    </article>
  );
}

function SelectedParcelaPanel({ item }: { item: ParcelaMapItem }) {
  return (
    <div className="map-detail-card">
      <p className="eyebrow">Parcela</p>
      <h3 className="title title--section">{buildParcelaTitle(item)}</h3>
      <dl className="map-detail-grid">
        <div>
          <dt>Codigo</dt>
          <dd>{item.code}</dd>
        </div>
        <div>
          <dt>Nombre</dt>
          <dd>{item.name || "Sin nombre"}</dd>
        </div>
        <div>
          <dt>Sector</dt>
          <dd>{item.sectorName || `Sector #${item.sectorId}`}</dd>
        </div>
        <div>
          <dt>Productor</dt>
          <dd>{item.productorLabel || "No disponible"}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{formatArea(item.areaHectares)}</dd>
        </div>
        <div>
          <dt>Geodatos</dt>
          <dd>
            {item.hasPolygon ? "Poligono" : item.hasPoint ? "Punto" : "Sin geodatos"}
          </dd>
        </div>
      </dl>
      {item.description ? (
        <div className="map-detail-description">
          <strong>Descripcion</strong>
          <p>{item.description}</p>
        </div>
      ) : null}
      <ActionLink
        href={`/visitas/parcelas/${item.id}`}
        label="Ver historial de visitas"
        variant="secondary"
      />
    </div>
  );
}

function SelectedVisitaPanel({ item }: { item: VisitaMapItem }) {
  return (
    <div className="map-detail-card">
      <p className="eyebrow">Visita</p>
      <h3 className="title title--section">{buildVisitaTitle(item)}</h3>
      <dl className="map-detail-grid">
        <div>
          <dt>Fecha de visita</dt>
          <dd>{formatVisitDate(item.visitDate)}</dd>
        </div>
        <div>
          <dt>Agronomo</dt>
          <dd>{item.agronomistName || `Usuario #${item.agronomistUserId}`}</dd>
        </div>
        <div>
          <dt>Productor</dt>
          <dd>{item.productorLabel || "No disponible"}</dd>
        </div>
        <div>
          <dt>Parcela</dt>
          <dd>{item.parcelaLabel || `Parcela #${item.parcelaId}`}</dd>
        </div>
        <div>
          <dt>Campania</dt>
          <dd>{item.campaignName || `Campania #${item.campaignId}`}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{item.isActive ? "Activa" : "Inactiva"}</dd>
        </div>
      </dl>
      <ActionLink
        href={`/visitas/${item.id}`}
        label="Ver detalle de visita"
        variant="secondary"
      />
    </div>
  );
}

function MissingList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="map-list__footnote">No hay pendientes para los filtros actuales.</p>
    );
  }

  return (
    <ul className="map-list">
      {items.slice(0, MISSING_GEODATA_PREVIEW_LIMIT).map((item) => (
        <li className="map-list__item" key={item}>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function buildProducerOptions(items: ParcelaMapItem[]) {
  return toOptions(
    items
      .filter((item) => item.productorId && item.productorLabel)
      .map((item) => ({ value: item.productorId!, label: item.productorLabel! }))
  );
}
function buildSectorOptions(items: ParcelaMapItem[], productorId: string) {
  return toOptions(
    items
      .filter((item) => !productorId || item.productorId === productorId)
      .map((item) => ({
        value: item.sectorId,
        label: item.sectorName || `Sector #${item.sectorId}`
      }))
  );
}
function buildParcelaOptions(items: ParcelaMapItem[], filters: AdminMapFilterState) {
  return toOptions(
    items
      .filter(
        (item) =>
          (!filters.productorId || item.productorId === filters.productorId) &&
          (!filters.sectorId || item.sectorId === filters.sectorId)
      )
      .map((item) => ({ value: item.id, label: buildParcelaTitle(item) }))
  );
}
function buildCampaignOptions(items: VisitaMapItem[], filters: AdminMapFilterState) {
  return toOptions(
    filterVisitas(items, { ...filters, campaignId: "" }).map((item) => ({
      value: item.campaignId,
      label: item.campaignName || `Campania #${item.campaignId}`
    }))
  );
}
function buildAgronomistOptions(items: VisitaMapItem[], filters: AdminMapFilterState) {
  return toOptions(
    filterVisitas(items, { ...filters, agronomistUserId: "" }).map((item) => ({
      value: item.agronomistUserId,
      label: item.agronomistName || `Usuario #${item.agronomistUserId}`
    }))
  );
}
function toOptions(items: SelectOption[]) {
  return Array.from(new Map(items.map((item) => [item.value, item])).values()).sort(
    (left, right) => left.label.localeCompare(right.label, "es")
  );
}
function filterParcelas(items: ParcelaMapItem[], filters: AdminMapFilterState) {
  return items.filter(
    (item) =>
      (!filters.productorId || item.productorId === filters.productorId) &&
      (!filters.sectorId || item.sectorId === filters.sectorId) &&
      (!filters.parcelaId || item.id === filters.parcelaId)
  );
}
function filterVisitas(items: VisitaMapItem[], filters: AdminMapFilterState) {
  return items.filter(
    (item) =>
      (!filters.productorId || item.productorId === filters.productorId) &&
      (!filters.sectorId || item.sectorId === filters.sectorId) &&
      (!filters.parcelaId || item.parcelaId === filters.parcelaId) &&
      (!filters.agronomistUserId || item.agronomistUserId === filters.agronomistUserId) &&
      (!filters.campaignId || item.campaignId === filters.campaignId) &&
      (!filters.startDate || item.visitDate >= filters.startDate) &&
      (!filters.endDate || item.visitDate <= filters.endDate)
  );
}
function hasVisitFilters(filters: AdminMapFilterState) {
  return Boolean(
    filters.agronomistUserId || filters.campaignId || filters.startDate || filters.endDate
  );
}
function resolveSelectedFeature(
  currentSelection: SelectedMapFeature | null,
  requestedVisitaId: string,
  visitas: VisitaMapItem[],
  parcelas: ParcelaMapItem[]
) {
  if (requestedVisitaId && visitas.some((item) => item.id === requestedVisitaId)) {
    return { kind: "visita" as const, id: requestedVisitaId };
  }
  if (
    currentSelection?.kind === "visita" &&
    visitas.some((item) => item.id === currentSelection.id)
  ) {
    return currentSelection;
  }
  if (
    currentSelection?.kind === "parcela" &&
    parcelas.some((item) => item.id === currentSelection.id)
  ) {
    return currentSelection;
  }
  if (visitas.length > 0) {
    return { kind: "visita" as const, id: visitas[0].id };
  }
  if (parcelas.length > 0) {
    return { kind: "parcela" as const, id: parcelas[0].id };
  }
  return null;
}
function sameSelection(
  left: SelectedMapFeature | null,
  right: SelectedMapFeature | null
) {
  return left?.kind === right?.kind && left?.id === right?.id;
}
function buildParcelaTitle(item: ParcelaMapItem) {
  return item.name ? `${item.code} - ${item.name}` : item.code;
}
function buildParcelaPopup(item: ParcelaMapItem) {
  return [
    `Sector: ${item.sectorName || `#${item.sectorId}`}`,
    item.productorLabel ? `Productor: ${item.productorLabel}` : null,
    `Area: ${formatArea(item.areaHectares)}`,
    item.description ? `Descripcion: ${item.description}` : null
  ]
    .filter(Boolean)
    .join("\n");
}
function buildVisitaTitle(item: VisitaMapItem) {
  return item.nroFicha?.trim() || item.publicId;
}
function buildVisitaPopup(item: VisitaMapItem) {
  return [
    `Fecha: ${formatVisitDate(item.visitDate)}`,
    `Agronomo: ${item.agronomistName || `Usuario #${item.agronomistUserId}`}`,
    item.productorLabel ? `Productor: ${item.productorLabel}` : null,
    `Parcela: ${item.parcelaLabel || `#${item.parcelaId}`}`,
    `Campania: ${item.campaignName || `#${item.campaignId}`}`,
    `Estado: ${item.isActive ? "Activa" : "Inactiva"}`
  ]
    .filter(Boolean)
    .join("\n");
}
function describeParcela(item: ParcelaMapItem) {
  return [
    item.sectorName || `Sector #${item.sectorId}`,
    item.productorLabel,
    formatArea(item.areaHectares)
  ]
    .filter(Boolean)
    .join(" | ");
}
function describeVisita(item: VisitaMapItem) {
  return [
    formatVisitDate(item.visitDate),
    item.parcelaLabel || `Parcela #${item.parcelaId}`,
    item.campaignName || `Campania #${item.campaignId}`
  ].join(" | ");
}
function formatArea(value: string | number | null) {
  if (value === null || value === "") {
    return "No registrada";
  }
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} ha` : String(value);
}
function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}
