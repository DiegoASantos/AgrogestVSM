"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import { isAdminSession } from "../../modules/auth/utils/authorization";
import { useTheme } from "../hooks/use-theme";
import { adminRoutes, siteConfig } from "../constants/site";
import { ActionLink } from "./action-link";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  const router = useRouter();
  const { session, status, logout } = useAuthSession();
  const { theme, toggleTheme, mounted } = useTheme();
  const isAuthenticated = status === "authenticated" && !!session;
  const isAdmin = isAdminSession(session);

  return (
    <main className="page-shell">
      <div className="page-shell__inner">
        <header className="topbar">
          <div className="brand-block">
            <p className="brand-block__eyebrow">Panel administrativo</p>
            <h1 className="brand-block__title">{siteConfig.name}</h1>
            <p className="brand-block__subtitle">{siteConfig.description}</p>
          </div>

          <nav className="nav-links" aria-label="Navegacion principal">
            {mounted && (
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                type="button"
                aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
                title={theme === "light" ? "Modo oscuro" : "Modo claro"}
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            )}
            <ActionLink href={adminRoutes.home} label="Inicio" variant="ghost" />

            {isAuthenticated ? (
              <>
                <ActionLink
                  href={adminRoutes.dashboard}
                  label="Dashboard"
                  variant="secondary"
                />
                <ActionLink href={adminRoutes.visitas} label="Visitas" variant="ghost" />
                <ActionLink href={adminRoutes.mapas} label="Mapas" variant="ghost" />
                {isAdmin ? (
                  <>
                    <ActionLink
                      href={adminRoutes.mantenimiento}
                      label="Mantenimiento"
                      variant="ghost"
                    />
                    <ActionLink href={adminRoutes.seguridad} label="Seguridad" variant="ghost" />
                  </>
                ) : null}
                <span className="auth-pill" title={session.user.email}>
                  {session.user.displayName}
                </span>
                <button
                  className="action-link action-link--ghost"
                  onClick={handleLogout}
                  type="button"
                >
                  Cerrar sesion
                </button>
              </>
            ) : null}

            {!isAuthenticated && status !== "loading" ? (
              <ActionLink href={adminRoutes.login} label="Login" variant="ghost" />
            ) : null}
          </nav>
        </header>

        {children}
      </div>
    </main>
  );

  function handleLogout() {
    logout();
    router.replace(adminRoutes.login);
  }
}
