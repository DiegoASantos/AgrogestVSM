"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Lock, Mail, Phone, User } from "lucide-react";

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
    const newPwd = form.newPassword.trim();
    const confirmPwd = form.confirmNewPassword.trim();

    if (!firstName) return "El nombre es obligatorio.";
    if (!lastName) return "El apellido es obligatorio.";
    if (!email) return "El correo es obligatorio.";
    if (!email.includes("@")) return "El correo no tiene un formato valido.";

    if (newPwd) {
      if (newPwd.length < 6) return "La nueva contraseña debe tener al menos 6 caracteres.";
      if (newPwd !== confirmPwd) return "La nueva contraseña y su confirmacion no coinciden.";
    }

    if (confirmPwd && !newPwd) {
      return "Ingresa la nueva contraseña antes de confirmarla.";
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
        newPassword: form.newPassword.trim()
      });

      await refreshUser();

      setSuccessMessage("Perfil actualizado correctamente.");
      setForm((prev) => ({
        ...prev,
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
    <form className="profile-form" id="profile-form" onSubmit={handleSubmit}>
      <section className="profile-section">
        <div className="profile-section__header">
          <span className="profile-section__badge profile-section__badge--required">
            Obligatorio
          </span>
          <h3 className="profile-section__title">Informacion personal</h3>
        </div>
        <p className="profile-section__desc">
          Estos datos son necesarios para identificarte en el sistema.
        </p>

        <div className="profile-section__body">
          <label className="field-group field-group--icon">
            <span>Nombre</span>
            <div className="field-group__input-wrapper">
              <User size={16} className="field-group__icon" />
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="Tu nombre"
                maxLength={100}
                required
              />
            </div>
          </label>

          <label className="field-group field-group--icon">
            <span>Apellido</span>
            <div className="field-group__input-wrapper">
              <User size={16} className="field-group__icon" />
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Tu apellido"
                maxLength={100}
                required
              />
            </div>
          </label>

          <label className="field-group field-group--icon">
            <span>Correo electronico</span>
            <div className="field-group__input-wrapper">
              <Mail size={16} className="field-group__icon" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                maxLength={150}
                required
              />
            </div>
          </label>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__header">
          <span className="profile-section__badge profile-section__badge--optional">
            Opcional
          </span>
          <h3 className="profile-section__title">Informacion de contacto</h3>
        </div>
        <p className="profile-section__desc">
          Un numero de telefono nos ayuda a contactarte si es necesario.
        </p>

        <div className="profile-section__body">
          <label className="field-group field-group--icon">
            <span>Telefono</span>
            <div className="field-group__input-wrapper">
              <Phone size={16} className="field-group__icon" />
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+51 999 888 777"
                maxLength={20}
              />
            </div>
          </label>
        </div>
      </section>

      <section className="profile-section profile-section--password">
        <div className="profile-section__header">
          <span className="profile-section__badge profile-section__badge--optional">
            Opcional
          </span>
          <h3 className="profile-section__title">Cambiar contraseña</h3>
        </div>
        <p className="profile-section__desc">
          Deja estos campos vacios si no deseas cambiar tu contraseña.
        </p>

        <div className="profile-section__body">
          <label className="field-group field-group--icon">
            <span>Nueva contraseña</span>
            <div className="field-group__input-wrapper">
              <Lock size={16} className="field-group__icon" />
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => updateField("newPassword", e.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
            </div>
          </label>

          <label className="field-group field-group--icon">
            <span>Confirmar nueva contraseña</span>
            <div className="field-group__input-wrapper">
              <Lock size={16} className="field-group__icon" />
              <input
                type="password"
                value={form.confirmNewPassword}
                onChange={(e) => updateField("confirmNewPassword", e.target.value)}
                placeholder="Repite la nueva contraseña"
                minLength={6}
              />
            </div>
          </label>
        </div>
      </section>

      {formError ? (
        <div className="profile-form__error">
          <p className="form-error">{formError}</p>
        </div>
      ) : null}
      {successMessage ? (
        <div className="profile-form__success">
          <p className="form-success">{successMessage}</p>
        </div>
      ) : null}

      <div className="profile-form__actions">
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
