"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "../hooks/use-auth-session";
import { adminRoutes } from "../../../shared/constants/site";
import { ActionLink } from "../../../shared/components/action-link";
import { toApiError } from "../../../shared/services";
import type { LoginErrors, LoginValues } from "../types/auth.types";

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: ""
};

export function LoginForm() {
  const router = useRouter();
  const { login, status } = useAuthSession();
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(adminRoutes.dashboard);
    }
  }, [router, status]);

  return (
    <section className="panel-grid">
      <article className="panel auth-card">
        <p className="eyebrow">Acceso</p>
        <h2 className="title title--section">Login administrativo</h2>
        <p className="body-copy">
          Ingresa con tu usuario administrativo para validar la sesion contra el
          backend y acceder al panel.
        </p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <label>
            Correo
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => handleChange("email", event.target.value)}
              placeholder="admin@agrogestvsm.local"
              type="email"
              value={values.email}
            />
          </label>
          {errors.email ? <p className="form-error">{errors.email}</p> : null}

          <label>
            Contrasena
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder="********"
              type="password"
              value={values.password}
            />
          </label>
          {errors.password ? <p className="form-error">{errors.password}</p> : null}
        </form>

        {submitError ? <p className="form-error">{submitError}</p> : null}

        <div className="actions">
          <button
            className="action-link action-link--primary"
            disabled={isSubmitting || status === "loading"}
            onClick={() => {
              void handleSubmit();
            }}
            type="button"
          >
            {isSubmitting ? "Ingresando..." : "Entrar"}
          </button>
          <ActionLink href={adminRoutes.home} label="Volver al inicio" variant="ghost" />
        </div>
      </article>
    </section>
  );

  function handleChange<K extends keyof LoginValues>(field: K, value: LoginValues[K]) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
    setSubmitError(null);
  }

  async function handleSubmit() {
    const nextErrors = validateLogin(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("Revisa tus credenciales antes de continuar.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await login({
        email: values.email.trim(),
        password: values.password
      });
      router.replace(adminRoutes.dashboard);
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError.message || "No se pudo iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
  }
}

function validateLogin(values: LoginValues): LoginErrors {
  const nextErrors: LoginErrors = {};
  const email = values.email.trim();

  if (!email) {
    nextErrors.email = "El correo es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    nextErrors.email = "Ingresa un correo valido.";
  }

  if (!values.password.trim()) {
    nextErrors.password = "La contrasena es obligatoria.";
  }

  return nextErrors;
}
