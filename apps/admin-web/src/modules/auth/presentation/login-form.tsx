"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UserRoundCheck
} from "lucide-react";

import { useAuthSession } from "../hooks/use-auth-session";
import { useTheme } from "../../../shared/hooks/use-theme";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import type { LoginErrors, LoginValues } from "../types/auth.types";

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: ""
};

export function LoginForm() {
  const router = useRouter();
  const { login, status } = useAuthSession();
  const { theme, toggleTheme, mounted } = useTheme();
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(adminRoutes.dashboard);
    }
  }, [router, status]);

  return (
    <main className="login-screen">
      <section className="login-hero" aria-label="Acceso administrativo">
        <div className="login-hero__brand">
          <img
            alt="VSM"
            className="login-hero__logo"
            src="/images/logo_vsm_transparente_4k.webp"
          />
          <div>
            <p className="login-hero__eyebrow">Panel administrativo</p>
            <h1>AgroGest VSM</h1>
          </div>
        </div>

        {mounted ? (
          <button
            className="login-theme-toggle"
            onClick={toggleTheme}
            type="button"
            aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
            title={theme === "light" ? "Modo oscuro" : "Modo claro"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        ) : null}

        <div className="login-hero__content">
          <p className="login-hero__kicker">Gestion agricola centralizada</p>
          <h2>Control operativo para visitas, parcelas y seguridad.</h2>
          <p>
            Accede al entorno administrativo para supervisar trabajo de campo,
            catalogos y permisos con una sesion protegida.
          </p>
        </div>

        <div className="login-proof-grid" aria-label="Caracteristicas del panel">
          <div className="login-proof">
            <div className="login-proof__icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <strong>Sesion validada por API</strong>
              <span>Conexion segura y verificada</span>
            </div>
          </div>
          <div className="login-proof">
            <div className="login-proof__icon">
              <UserRoundCheck size={22} />
            </div>
            <div>
              <strong>Acceso por roles</strong>
              <span>Permisos segun tu perfil</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card__secure-icon" aria-hidden="true">
          <ShieldCheck size={20} />
        </div>
        <div className="auth-card__header">
          <p className="eyebrow">Acceso seguro</p>
          <h2 className="title title--section" id="login-title">
            Iniciar sesion
          </h2>
          <p className="body-copy">
            Usa tus credenciales administrativas para ingresar al panel.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          noValidate
        >
          <div className="login-field">
            <label htmlFor="email">Correo</label>
            <div className="login-input-shell">
              <Mail size={18} aria-hidden="true" />
              <input
                autoComplete="email"
                id="email"
                name="email"
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="admin@agrogest.pe"
                type="email"
                value={values.email}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
            </div>
            {errors.email ? (
              <p className="form-error" id="email-error">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="login-field">
            <label htmlFor="password">Contrasena</label>
            <div className="login-input-shell login-input-shell--password">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={(event) => handleChange("password", event.target.value)}
                placeholder="Ingresa tu contrasena"
                type={showPassword ? "text" : "password"}
                value={values.password}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                title={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? (
              <p className="form-error" id="password-error">
                {errors.password}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="form-error form-error--block" role="alert">
              {submitError}
            </p>
          ) : null}

          <button
            className="login-submit"
            disabled={isSubmitting || status === "loading"}
            type="submit"
          >
            <span>{isSubmitting ? "Ingresando..." : "Iniciar sesion"}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-card__footnote">
          {status === "loading"
            ? "Verificando sesion activa..."
            : "El acceso esta reservado para usuarios autorizados."}
        </p>
      </section>
    </main>
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
