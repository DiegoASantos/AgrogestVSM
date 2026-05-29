"use client";

import { useEffect, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { isAdminSession } from "../../auth/utils/authorization";
import { dashboardService } from "../services/dashboard.service";
import type { DashboardSummary } from "../types/dashboard.types";
import { ActionLink } from "../../../shared/components/action-link";
import { ErrorState } from "../../../shared/components/error-state";
import { LoadingState } from "../../../shared/components/loading-state";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";

const baseQuickActions = [
  {
    label: "Gestionar visitas",
    href: adminRoutes.visitas,
    description: "Entrar al listado operativo y revisar el detalle completo."
  },
  {
    label: "Abrir mapas",
    href: adminRoutes.mapas,
    description: "Revisar parcelas y visitas en contexto geografico."
  },
  {
    label: "Abrir mantenimiento",
    href: adminRoutes.mantenimiento,
    description: "Ir a catalogos y datos maestros del sistema."
  },
  {
    label: "Abrir seguridad",
    href: adminRoutes.seguridad,
    description: "Administrar usuarios, roles y asignaciones."
  }
];

export function DashboardOverview() {
  const { session, logout } = useAuthSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = isAdminSession(session);
  const quickActions = baseQuickActions.filter(
    (action) =>
      isAdmin ||
      (action.href !== adminRoutes.mantenimiento && action.href !== adminRoutes.seguridad)
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadSummary();
  }, [session]);

  if (isLoading) {
    return <LoadingState description="Cargando el resumen operativo del panel." />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        action={
          <button className="ui-button ui-button--secondary" onClick={loadSummary} type="button">
            Reintentar
          </button>
        }
        description={errorMessage}
      />
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <section className="panel-grid">
      <article className="panel">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2 className="title title--section">Vista operativa inicial del panel</h2>
            <p className="body-copy">
              Resumen base para entrar rapido a visitas, mantenimiento y seguridad sin
              agregar analitica compleja todavia.
            </p>
          </div>

          <div className="actions">
            <ActionLink href={adminRoutes.visitas} label="Ir a visitas" variant="primary" />
            {isAdmin ? (
              <ActionLink
                href={adminRoutes.mantenimiento}
                label="Ir a mantenimiento"
                variant="ghost"
              />
            ) : (
              <ActionLink href={adminRoutes.mapas} label="Ir a mapas" variant="ghost" />
            )}
          </div>
        </div>

        <div className="stat-grid">
          <article className="stat-card">
            <p className="stat-card__label">Visitas activas</p>
            <p className="stat-card__value">{summary.activeVisitsCount}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Productores</p>
            <p className="stat-card__value">{summary.productoresCount}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Parcelas activas</p>
            <p className="stat-card__value">{summary.activeParcelasCount}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Campañas activas</p>
            <p className="stat-card__value">{summary.activeCampaniasCount}</p>
          </article>
        </div>
      </article>

      <div className="panel-grid panel-grid--two">
        <article className="panel">
          <p className="eyebrow">Accesos rapidos</p>
          <h2 className="title title--section">Entradas principales</h2>
          <ul className="feature-list">
            {quickActions.map((action) => (
              <li className="feature-item" key={action.href}>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
                <div className="actions">
                  <ActionLink href={action.href} label="Abrir" variant="secondary" />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel panel--accent">
          <p className="eyebrow">Sesion administrativa</p>
          <h2 className="title title--section">Contexto actual</h2>
          <div className="dashboard-session">
            <div className="dashboard-session__row">
              <span>Usuario</span>
              <strong>{session?.user.displayName ?? "Sin sesion"}</strong>
            </div>
            <div className="dashboard-session__row">
              <span>Correo</span>
              <strong>{session?.user.email ?? "No disponible"}</strong>
            </div>
            <div className="dashboard-session__row">
              <span>Roles</span>
              <strong>
                {session?.user.roles.map((role) => role.code).join(", ") || "Sin roles"}
              </strong>
            </div>
          </div>

          <div className="actions">
            <button className="ui-button ui-button--ghost" onClick={logout} type="button">
              Cerrar sesion
            </button>
          </div>
        </article>
      </div>
    </section>
  );

  async function loadSummary() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const nextSummary = await dashboardService.getSummary(session);
      setSummary(nextSummary);
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
