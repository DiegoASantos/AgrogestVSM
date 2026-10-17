"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AuthSession } from "../../auth/types/auth.types";
import { agriculturalCatalogsService } from "../../mantenimiento/services/agricultural-catalogs.service";
import type { CatalogOption } from "../../mantenimiento/types/agricultural-catalogs.types";
import { FormModal } from "../../../shared/components/form-modal";
import { productoresService } from "../services/productores.service";
import type { ProductorEntityType, ProductorListItem, ProductorPayload } from "../types/productores.types";

type Form = {
  entityType: ProductorEntityType; documentTypeId: string; documentNumber: string;
  firstName: string; lastName: string; phone: string; email: string; address: string;
};
const empty: Form = { entityType: "persona", documentTypeId: "", documentNumber: "",
  firstName: "", lastName: "", phone: "", email: "", address: "" };

export function ProductorFormModal({ open, session, initial, documentTypeOptions, onClose, onSaved }: {
  open: boolean;
  session: AuthSession | null;
  initial?: ProductorListItem | null;
  documentTypeOptions?: CatalogOption[];
  onClose: () => void;
  onSaved: (item: ProductorListItem) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Form>(empty);
  const [types, setTypes] = useState<CatalogOption[]>(documentTypeOptions ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      entityType: initial.entityType,
      documentTypeId: initial.documentTypeId === null ? "" : String(initial.documentTypeId),
      documentNumber: initial.documentNumber ?? "", firstName: initial.firstName ?? "",
      lastName: initial.lastName ?? "", phone: initial.phone ?? "", email: initial.email ?? "",
      address: initial.address ?? ""
    } : empty);
    setError("");
  }, [open, initial]);
  useEffect(() => {
    if (!open || !session) return;
    if (documentTypeOptions) { setTypes(documentTypeOptions); return; }
    void agriculturalCatalogsService.getTiposDocumento(session)
      .then((items) => setTypes(items.map((item) => ({ id: item.id, label: `${item.code} - ${item.name}` }))))
      .catch(() => setError("No se pudieron cargar los tipos de documento."));
  }, [open, session, documentTypeOptions]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy) return;
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (form.entityType === "persona" && (!firstName || !lastName)) {
      setError("Nombres y apellidos son obligatorios para personas."); return;
    }
    if (form.entityType === "persona" && Boolean(form.documentTypeId) !== Boolean(form.documentNumber.trim())) {
      setError("Tipo y número de documento deben registrarse juntos."); return;
    }
    if (form.entityType !== "persona" && !firstName) { setError("Ingresa el nombre de la entidad."); return; }
    setBusy(true); setError("");
    try {
      const payload: ProductorPayload = {
        entityType: form.entityType,
        documentTypeId: form.entityType === "persona" && form.documentTypeId ? Number(form.documentTypeId) : null,
        documentNumber: form.entityType === "persona" ? form.documentNumber.trim() || null : null,
        firstName: firstName || null,
        lastName: form.entityType === "persona" ? lastName || null : null,
        phone: form.phone.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        address: form.address.trim() || null
      };
      const saved = initial
        ? await productoresService.update(session, initial.id, payload)
        : await productoresService.create(session, payload);
      await onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el productor.");
    } finally { setBusy(false); }
  }
  const change = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return <FormModal open={open} onClose={onClose} title={initial ? "Editar productor" : "Nuevo productor"}
    description="Alta o edición simple de productores." footer={<>
      <button className="ui-button ui-button--ghost" type="button" onClick={onClose}>Cancelar</button>
      <button className="ui-button ui-button--primary" disabled={busy} form="productores-form" type="submit">
        {busy ? "Guardando…" : initial ? "Guardar cambios" : "Crear productor"}
      </button>
    </>}>
    <form className="form-layout" id="productores-form" onSubmit={(event) => void submit(event)}>
      <label className="field-group"><span>Entidad</span>
        <select value={form.entityType} onChange={(event) => setForm((current) => ({
          ...current, entityType: event.target.value as ProductorEntityType,
          documentTypeId: event.target.value === "persona" ? current.documentTypeId : "",
          documentNumber: event.target.value === "persona" ? current.documentNumber : "",
          lastName: event.target.value === "persona" ? current.lastName : ""
        }))}>
          <option value="persona">Persona</option><option value="fundo">Fundo</option>
          <option value="cooperativa">Cooperativa</option>
        </select>
      </label>
      {form.entityType === "persona" && <>
        <label className="field-group"><span>Tipo de documento</span>
          <select value={form.documentTypeId} onChange={(event) => change("documentTypeId", event.target.value)}>
            <option value="">Selecciona un tipo</option>
            {types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="field-group"><span>Número de documento</span>
          <input value={form.documentNumber} onChange={(event) => change("documentNumber", event.target.value)} />
        </label>
      </>}
      <div className="field-grid">
        <label className="field-group"><span>{form.entityType === "persona" ? "Nombres" : "Nombre"}</span>
          <input value={form.firstName} onChange={(event) => change("firstName", event.target.value)} />
        </label>
        {form.entityType === "persona" && <label className="field-group"><span>Apellidos</span>
          <input value={form.lastName} onChange={(event) => change("lastName", event.target.value)} />
        </label>}
      </div>
      <div className="field-grid">
        <label className="field-group"><span>Teléfono</span>
          <input value={form.phone} onChange={(event) => change("phone", event.target.value)} /></label>
        <label className="field-group"><span>Correo</span>
          <input value={form.email} onChange={(event) => change("email", event.target.value)} /></label>
      </div>
      <label className="field-group"><span>Dirección</span>
        <textarea value={form.address} onChange={(event) => change("address", event.target.value)} />
      </label>
      <p className="form-help">{initial
        ? `Estado calculado desde sus parcelas: ${initial.isActive ? "Activo" : "Inactivo"}.`
        : "El productor quedará inactivo hasta que tenga una parcela activa."}</p>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
  </FormModal>;
}
