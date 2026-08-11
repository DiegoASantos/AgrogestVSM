"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Droplets, Pencil, RefreshCw, Trash2 } from "lucide-react";

import type { AuthSession } from "../../auth/types/auth.types";
import { canManageReservoirReadings } from "../../auth/utils/authorization";
import {
  climaService,
  type Reservoir,
  type ReservoirReading
} from "../services/clima.service";
import { reservoirFixedDetails, toLocalDateTimeInput } from "./reservoirs-view.utils";

const VARIABLE_OPTIONS = [
  { value: "volumen_mmc", label: "Volumen", unit: "MMC" },
  { value: "cota_msnm", label: "Cota", unit: "msnm" },
  { value: "caudal_entrada_m3s", label: "Caudal de entrada", unit: "m3/s" },
  { value: "caudal_salida_m3s", label: "Caudal de salida", unit: "m3/s" },
  { value: "evaporacion_mm", label: "Evaporación", unit: "mm" }
] as const;

type ReservoirVariable = (typeof VARIABLE_OPTIONS)[number]["value"];
type ReadingType = "OBSERVADO" | "ESTIMADO";
type FormState = {
  variable: ReservoirVariable;
  value: string;
  type: ReadingType;
  dataAt: string;
};

const EMPTY_FORM: FormState = {
  variable: "volumen_mmc",
  value: "",
  type: "OBSERVADO",
  dataAt: ""
};

export function ReservoirsView({
  initialReservoirs,
  session
}: {
  initialReservoirs: Reservoir[];
  session: AuthSession;
}) {
  const [reservoirs, setReservoirs] = useState(initialReservoirs);
  const [selectedId, setSelectedId] = useState(initialReservoirs[0]?.publicId ?? "");
  const [readings, setReadings] = useState<ReservoirReading[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    dataAt: toLocalDateTimeInput(new Date())
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      reservoirs.find((reservoir) => reservoir.publicId === selectedId) ?? reservoirs[0],
    [reservoirs, selectedId]
  );
  const canManage = canManageReservoirReadings(session);
  const selectedVariable = variableDefinition(form.variable);

  useEffect(() => {
    if (!selected?.publicId) {
      setReadings([]);
      return;
    }

    let ignore = false;
    setLoadingHistory(true);
    setError(null);
    void climaService
      .getReservorioHistory(session, selected.publicId)
      .then((response) => {
        if (!ignore) setReadings(response.rows);
      })
      .catch((reason: unknown) => {
        if (!ignore) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!ignore) setLoadingHistory(false);
      });

    return () => {
      ignore = true;
    };
  }, [selected?.publicId, session]);

  async function refresh() {
    if (!selected) return;
    const [nextReservoirs, history] = await Promise.all([
      climaService.getReservorios(session),
      climaService.getReservorioHistory(session, selected.publicId)
    ]);
    setReservoirs(nextReservoirs);
    setReadings(history.rows);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    const value = Number(form.value);
    if (!Number.isFinite(value) || value < 0) {
      setError("Ingrese un valor numérico mayor o igual que cero.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const body = {
      variable: form.variable,
      valor: value,
      unidad: selectedVariable.unit,
      tipo: form.type,
      dato_at: new Date(form.dataAt).toISOString()
    };

    try {
      if (editingId) {
        await climaService.updateReservorioReading(
          session,
          selected.publicId,
          editingId,
          body
        );
        setMessage("Lectura actualizada correctamente.");
      } else {
        await climaService.createReservorioReading(session, selected.publicId, body);
        setMessage("Lectura registrada correctamente.");
      }
      resetForm();
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  function editReading(reading: ReservoirReading) {
    setEditingId(reading.publicId);
    setForm({
      variable: reading.variable as ReservoirVariable,
      value: String(reading.value),
      type: reading.type as ReadingType,
      dataAt: toLocalDateTimeInput(new Date(reading.dataAt))
    });
    setMessage(null);
    setError(null);
  }

  async function deleteReading(reading: ReservoirReading) {
    if (!selected) return;
    const confirmed = window.confirm(
      `¿Eliminar la lectura de ${variableDefinition(reading.variable).label}?`
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    try {
      await climaService.deleteReservorioReading(
        session,
        selected.publicId,
        reading.publicId
      );
      setMessage("Lectura eliminada correctamente.");
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      dataAt: toLocalDateTimeInput(new Date())
    });
  }

  if (!selected) {
    return (
      <p className="climate-empty">
        No hay reservorios configurados. Ejecute primero la migración 044.
      </p>
    );
  }

  return (
    <div className="climate-stack reservoir-page">
      <section className="climate-data-section">
        <header>
          <div>
            <p className="eyebrow">Características permanentes</p>
            <h3 className="title title--section">Datos fijos de reservorios</h3>
          </div>
          <button
            className="ui-button ui-button--ghost ui-button--compact"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={16} />
            Actualizar
          </button>
        </header>
        <div className="reservoir-fixed-grid">
          {reservoirs.map((reservoir) => (
            <button
              className={`reservoir-fixed-card${
                reservoir.publicId === selected.publicId
                  ? " reservoir-fixed-card--selected"
                  : ""
              }`}
              key={reservoir.publicId}
              onClick={() => {
                setSelectedId(reservoir.publicId);
                resetForm();
              }}
              type="button"
            >
              <span className="reservoir-fixed-card__title">
                <Droplets aria-hidden="true" size={20} />
                <strong>{reservoir.name}</strong>
              </span>
              <span>
                {reservoir.district}, {reservoir.province}
              </span>
              <dl>
                {reservoirFixedDetails(reservoir).map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </button>
          ))}
        </div>
      </section>

      <section className="climate-data-section">
        <header>
          <div>
            <p className="eyebrow">Última información registrada</p>
            <h3 className="title title--section">Estado de {selected.name}</h3>
          </div>
          <span className="climate-badge">
            {selected.latestDataAt
              ? `Actualizado ${formatDate(selected.latestDataAt)}`
              : "Sin lecturas manuales"}
          </span>
        </header>
        <div className="reservoir-latest-grid">
          <Metric label="Volumen" unit="MMC" value={selected.latestVolumeMmc} />
          <Metric label="Cota" unit="msnm" value={selected.latestCota} />
          <Metric
            label="Caudal de entrada"
            unit="m3/s"
            value={selected.latestInflowM3s}
          />
          <Metric
            label="Caudal de salida"
            unit="m3/s"
            value={selected.latestOutflowM3s}
          />
          <Metric label="Evaporación" unit="mm" value={selected.latestEvaporationMm} />
        </div>
      </section>

      {canManage ? (
        <section className="climate-data-section">
          <header>
            <div>
              <p className="eyebrow">Carga manual</p>
              <h3 className="title title--section">
                {editingId ? "Editar lectura" : `Nueva lectura de ${selected.name}`}
              </h3>
            </div>
          </header>
          <form className="reservoir-reading-form" onSubmit={handleSubmit}>
            <label className="field-group">
              <span className="field-group__label">Variable</span>
              <select
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    variable: event.target.value as ReservoirVariable
                  }))
                }
                value={form.variable}
              >
                {VARIABLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span className="field-group__label">Valor</span>
              <input
                min="0"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    value: event.target.value
                  }))
                }
                required
                step="any"
                type="number"
                value={form.value}
              />
            </label>
            <label className="field-group">
              <span className="field-group__label">Unidad</span>
              <input readOnly value={selectedVariable.unit} />
            </label>
            <label className="field-group">
              <span className="field-group__label">Tipo</span>
              <select
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as ReadingType
                  }))
                }
                value={form.type}
              >
                <option value="OBSERVADO">Observado</option>
                <option value="ESTIMADO">Estimado</option>
              </select>
            </label>
            <label className="field-group">
              <span className="field-group__label">Fecha y hora del dato</span>
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dataAt: event.target.value
                  }))
                }
                required
                type="datetime-local"
                value={form.dataAt}
              />
            </label>
            <div className="reservoir-reading-form__actions">
              {editingId ? (
                <button
                  className="ui-button ui-button--ghost"
                  onClick={resetForm}
                  type="button"
                >
                  Cancelar edición
                </button>
              ) : null}
              <button
                className="ui-button ui-button--primary"
                disabled={saving}
                type="submit"
              >
                {saving
                  ? "Guardando…"
                  : editingId
                    ? "Guardar cambios"
                    : "Registrar lectura"}
              </button>
            </div>
          </form>
          {error ? (
            <p className="reservoir-feedback reservoir-feedback--error">{error}</p>
          ) : null}
          {message ? (
            <p className="reservoir-feedback reservoir-feedback--success">{message}</p>
          ) : null}
        </section>
      ) : (
        <aside className="climate-notice" role="note">
          <Droplets aria-hidden="true" size={18} />
          <div>
            <strong>Acceso de solo lectura.</strong>
            El rol AGRONOMO puede consultar las lecturas, pero no modificarlas.
          </div>
        </aside>
      )}

      <section className="climate-table-card">
        <div className="climate-table-card__header">
          <h3 className="title title--section">Historial de {selected.name}</h3>
          <span>{readings.length} registros</span>
        </div>
        {loadingHistory ? (
          <p className="climate-empty">Cargando lecturas…</p>
        ) : readings.length === 0 ? (
          <p className="climate-empty">Todavía no se registraron lecturas manuales.</p>
        ) : (
          <div className="data-table__wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha del dato</th>
                  <th>Variable</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  {canManage ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => (
                  <tr key={reading.publicId}>
                    <td>{formatDate(reading.dataAt)}</td>
                    <td>{variableDefinition(reading.variable).label}</td>
                    <td>
                      {reading.value.toLocaleString("es-PE")} {reading.unit}
                    </td>
                    <td>
                      <span className="climate-badge">{reading.type}</span>
                    </td>
                    {canManage ? (
                      <td>
                        <div className="reservoir-table-actions">
                          <button
                            aria-label="Editar lectura"
                            className="ui-button ui-button--ghost ui-button--compact"
                            onClick={() => editReading(reading)}
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={15} />
                            Editar
                          </button>
                          <button
                            aria-label="Eliminar lectura"
                            className="ui-button ui-button--ghost ui-button--compact"
                            onClick={() => void deleteReading(reading)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={15} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  unit,
  value
}: {
  label: string;
  unit: string;
  value: number | null;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>
        {value === null ? "Sin dato" : `${value.toLocaleString("es-PE")} ${unit}`}
      </strong>
    </article>
  );
}

function variableDefinition(variable: string) {
  return (
    VARIABLE_OPTIONS.find((option) => option.value === variable) ?? {
      value: variable,
      label: variable,
      unit: ""
    }
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "No se pudo completar la operación de reservorios.";
}
