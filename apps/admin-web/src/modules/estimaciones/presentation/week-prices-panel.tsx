import type { EstimationWeekPrices } from "../types/estimaciones.types";
import type { PriceDrafts } from "../utils/week-prices";

export function WeekPricesPanel({ data, drafts, isSaving, error, successMessage, onChange }: {
  data: EstimationWeekPrices;
  drafts: PriceDrafts;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  onChange: (drafts: PriceDrafts) => void;
}) {
  const formatPrice = (value: number) => new Intl.NumberFormat("es-PE", {
    style: "currency", currency: "PEN"
  }).format(value);
  return (
    <section className="estimations-table-panel" aria-label="Precios semanales por jaba">
      <header className="estimations-table-panel__header">
        <div>
          <h3>Precio estimado por jaba</h3>
          <p>Un rango general en soles para la semana seleccionada.</p>
        </div>
        <strong>{data.priceRange
          ? `${formatPrice(data.priceRange.precioMinimo)} – ${formatPrice(data.priceRange.precioMaximo)}`
          : "Sin estimación"}</strong>
      </header>
      <div className="filter-bar">
        <label className="field-group">
          <span>Precio mínimo (S/ por jaba)</span>
          <input inputMode="decimal" disabled={isSaving} value={drafts.minimum}
            placeholder="Ej. 20.50" onChange={(event) => onChange({ ...drafts, minimum: event.target.value })} />
        </label>
        <label className="field-group">
          <span>Precio máximo (S/ por jaba)</span>
          <input inputMode="decimal" disabled={isSaving} value={drafts.maximum}
            placeholder="Ej. 30.00" onChange={(event) => onChange({ ...drafts, maximum: event.target.value })} />
        </label>
      </div>
      <p>Deja ambos campos vacíos y guarda para retirar el rango. Esta referencia no modifica los pagos.</p>
      {data.priceRange ? <p>
        Creó {data.priceRange.createdByName} · Editó {data.priceRange.updatedByName}
        {" · "}{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(data.priceRange.updatedAt))}
      </p> : null}
      {error ? <p className="form-error form-error--block" role="alert">{error}</p> : null}
      {successMessage ? <p className="estimations-save-status" role="status">{successMessage}</p> : null}
    </section>
  );
}
