"use client";

import { useMemo, useState, type FormEvent } from "react";

import { toApiError } from "../../../shared/services";
import { useAuthSession } from "../hooks/use-auth-session";
import { authService } from "../services/auth.service";
import type { UpdateProfileValues } from "../types/auth.types";

export function ProfileForm() {
  const { session, refreshUser, logout } = useAuthSession();
  const user = session?.user;

  const initialForm = useMemo<UpdateProfileValues>(
    () => ({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: ""
    }),
    [user]
  );

  const [form, setForm] = useState<UpdateProfileValues>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field: keyof UpdateProfileValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
    if (successMessage) setSuccessMessage(null);
  }

  function validate(): string | null {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const currentPwd = form.currentPassword.trim();
    const newPwd = form.newPassword.trim();
    const confirmPwd = form.confirmNewPassword.trim();

    if (!firstName) return "El nombre es obligatorio.";
    if (!lastName) return "El apellido es obligatorio.";
    if (!email) return "El correo es obligatorio.";
    if (!email.includes("@")) return "El correo no tiene un formato valido.";

    if (newPwd || currentPwd) {
      if (!currentPwd) return "Debes ingresar tu contrasena actual para cambiarla.";
      if (!newPwd) return "Debes ingresar la nueva contrasena.";
      if (newPwd.length < 6) return "La nueva contrasena debe tener al menos 6 caracteres.";
      if (newPwd !== confirmPwd) return "La nueva contrasena y su confirmacion no coinciden.";
    }

    const noChanges =
      firstName === (user?.firstName ?? "") &&
      lastName === (user?.lastName ?? "") &&
      email === (user?.email ?? "") &&
      (form.phone.trim() || "") === (user?.phone ?? "") &&
      !newPwd;

    if (noChanges) return "No se detectaron cambios en el perfil.";

    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccessMessage(null);

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!session) {
      setFormError("No hay una sesion activa.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await authService.updateProfile(session, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || "",
        currentPassword: form.currentPassword.trim(),
        newPassword: form.newPassword.trim()
      });

      await refreshUser();

      setSuccessMessage("Perfil actualizado correctamente.");
      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: ""
      }));
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.statusCode === 401) {
        setFormError("La sesion expiro. Vuelve a iniciar sesion.");
        logout();
        return;
      }
      setFormError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-layout" id="profile-form" onSubmit={handleSubmit}>
      <fieldset className="form-layout__section">
        <legend className="form-layout__section-title">Datos personales</legend>

        <label className="field-group">
          <span>Nombre</span>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            placeholder="Tu nombre"
            maxLength={100}
            required
          />
        </label>

        <label className="field-group">
          <span>Apellido</span>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            placeholder="Tu apellido"
            maxLength={100}
            required
          />
        </label>

        <label className="field-group">
          <span>Correo electronico</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="tu.correo@ejemplo.com"
            maxLength={150}
            required
          />
        </label>

        <label className="field-group">
          <span>Telefono</span>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="Opcional"
            maxLength={20}
          />
        </label>
      </fieldset>

      <fieldset className="form-layout__section">
        <legend className="form-layout__section-title">Cambiar contrasena</legend>
        <p className="form-layout__section-hint">
          Completa estos campos solo si deseas cambiar tu contrasena.
        </p>

        <label className="field-group">
          <span>Contrasena actual</span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => updateField("currentPassword", e.target.value)}
            placeholder="Tu contrasena actual"
          />
        </label>

        <label className="field-group">
          <span>Nueva contrasena</span>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => updateField("newPassword", e.target.value)}
            placeholder="Minimo 6 caracteres"
            minLength={6}
          />
        </label>

        <label className="field-group">
          <span>Confirmar nueva contrasena</span>
          <input
            type="password"
            value={form.confirmNewPassword}
            onChange={(e) => updateField("confirmNewPassword", e.target.value)}
            placeholder="Repite la nueva contrasena"
            minLength={6}
          />
        </label>
      </fieldset>

      {formError ? <p className="form-error">{formError}</p> : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <div className="actions">
        <button
          className="ui-button ui-button--primary"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
