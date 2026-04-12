"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  MapIcon,
  Wrench,
  ShieldCheck,
  Sprout,
  CalendarDays,
  Leaf,
  Users,
  Package,
  FlaskConical,
  AlertTriangle,
  Bug,
  Puzzle,
  MapPin,
  FileText,
  User,
  KeyRound,
  UserCog,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  type LucideIcon
} from "lucide-react";

import { useAuthSession } from "../../modules/auth/hooks/use-auth-session";
import {
  canAccessAdminPath,
  isAdminSession
} from "../../modules/auth/utils/authorization";
import { useTheme } from "../hooks/use-theme";
import {
  adminMainNavigation,
  adminMaintenanceNavigation,
  adminSecurityNavigation,
  resolveAdminRouteMeta,
  type AdminNavLink
} from "../constants/admin-navigation";
import { adminRoutes } from "../constants/site";

type AdminLayoutShellProps = {
  children: ReactNode;
};

const mainNavIcons: Record<string, LucideIcon> = {
  [adminRoutes.dashboard]: LayoutDashboard,
  [adminRoutes.visitas]: ClipboardList,
  [adminRoutes.mapas]: MapIcon,
  [adminRoutes.mantenimiento]: Wrench,
  [adminRoutes.seguridad]: ShieldCheck
};

const maintenanceNavIcons: Record<string, LucideIcon> = {
  [adminRoutes.mantenimientoItems.cultivos]: Sprout,
  [adminRoutes.mantenimientoItems.campanias]: CalendarDays,
  [adminRoutes.mantenimientoItems.etapasFenologicas]: Leaf,
  [adminRoutes.mantenimientoItems.productores]: Users,
  [adminRoutes.mantenimientoItems.productos]: Package,
  [adminRoutes.mantenimientoItems.ingredientesActivos]: FlaskConical,
  [adminRoutes.mantenimientoItems.nivelesIncidencia]: AlertTriangle,
  [adminRoutes.mantenimientoItems.plagasEnfermedades]: Bug,
  [adminRoutes.mantenimientoItems.productoIngredientes]: Puzzle,
  [adminRoutes.mantenimientoItems.sectores]: MapPin,
  [adminRoutes.mantenimientoItems.tiposDocumento]: FileText
};

const securityNavIcons: Record<string, LucideIcon> = {
  [adminRoutes.seguridadItems.usuarios]: User,
  [adminRoutes.seguridadItems.roles]: KeyRound,
  [adminRoutes.seguridadItems.usuarioRoles]: UserCog
};

function getIconForHref(href: string): LucideIcon | undefined {
  return mainNavIcons[href] ?? maintenanceNavIcons[href] ?? securityNavIcons[href];
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, status, logout } = useAuthSession();
  const routeMeta = resolveAdminRouteMeta(pathname);
  const { theme, toggleTheme, mounted } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = isAdminSession(session);
  const canAccessCurrentRoute = canAccessAdminPath(pathname, session);
  const maintenanceNavigation = isAdmin ? adminMaintenanceNavigation : [];
  const securityNavigation = isAdmin ? adminSecurityNavigation : [];

  useEffect(() => {
    if (status === "guest") {
      router.replace(adminRoutes.login);
    }
  }, [router, status]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (status === "loading") {
    return (
      <main className="page-shell">
        <div className="page-shell__inner">
          <section className="panel-grid">
            <article className="panel">
              <p className="eyebrow">Sesion</p>
              <h2 className="title title--section">Verificando acceso...</h2>
              <p className="body-copy">
                Estamos validando la sesion actual antes de mostrar el panel.
              </p>
            </article>
          </section>
        </div>
      </main>
    );
  }

  if (status !== "authenticated" || !session) {
    return null;
  }

  const userInitials = getInitials(session.user.displayName);

  return (
    <main className="admin-layout">
      <button
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        type="button"
        aria-label={sidebarOpen ? "Cerrar menu" : "Abrir menu"}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar${sidebarOpen ? " admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar__brand">
          <div className="brand-logo">
            <Sprout size={22} />
          </div>
          <div className="brand-text">
            <h1 className="brand-text__name">AgroGest VSM</h1>
            <p className="brand-text__role">Panel administrativo</p>
          </div>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Navegacion administrativa">
          <SidebarGroup
            items={adminMainNavigation}
            pathname={pathname}
            title="Principal"
            defaultOpen
          />
          {maintenanceNavigation.length > 0 ? (
            <SidebarGroup
              items={maintenanceNavigation}
              pathname={pathname}
              title="Mantenimiento"
              icon={Wrench}
            />
          ) : null}
          {securityNavigation.length > 0 ? (
            <SidebarGroup
              items={securityNavigation}
              pathname={pathname}
              title="Seguridad"
              icon={ShieldCheck}
            />
          ) : null}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="sidebar-user">
            <div className="sidebar-user__avatar">{userInitials}</div>
            <div className="sidebar-user__info">
              <strong>{session.user.displayName}</strong>
              <span>
                {session.user.roles.map((role) => role.code).join(", ") || "Sin roles"}
              </span>
            </div>
          </div>
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            type="button"
            title="Cerrar sesion"
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <h2 className="admin-topbar__title">{routeMeta.label}</h2>
            <p className="admin-topbar__desc">{routeMeta.description}</p>
          </div>

          <div className="admin-topbar__right">
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
            <div className="topbar-user-pill">
              <div className="topbar-user-pill__avatar">{userInitials}</div>
              <span className="topbar-user-pill__name">{session.user.displayName}</span>
            </div>
          </div>
        </header>

        <section className="admin-content">
          {canAccessCurrentRoute ? (
            children
          ) : (
            <section className="panel-grid">
              <article className="panel">
                <p className="eyebrow">Acceso restringido</p>
                <h2 className="title title--section">No tienes permisos para este modulo.</h2>
                <p className="body-copy">
                  Este espacio requiere el rol <strong>ADMIN</strong>. Puedes volver al
                  dashboard o continuar con las vistas operativas habilitadas.
                </p>
                <div className="actions">
                  <Link className="ui-button ui-button--secondary" href={adminRoutes.dashboard}>
                    Ir a dashboard
                  </Link>
                  <Link className="ui-button ui-button--ghost" href={adminRoutes.visitas}>
                    Ir a visitas
                  </Link>
                  <Link className="ui-button ui-button--ghost" href={adminRoutes.mapas}>
                    Ir a mapas
                  </Link>
                </div>
              </article>
            </section>
          )}
        </section>
      </div>
    </main>
  );

  function handleLogout() {
    logout();
    router.replace(adminRoutes.login);
  }
}

function SidebarGroup({
  title,
  items,
  pathname,
  defaultOpen,
  icon: GroupIcon
}: {
  title: string;
  items: AdminNavLink[];
  pathname: string;
  defaultOpen?: boolean;
  icon?: LucideIcon;
}) {
  const hasActiveChild = items.some((item) => matchesPath(pathname, item.href));
  const [isOpen, setIsOpen] = useState(defaultOpen ?? hasActiveChild);

  useEffect(() => {
    if (hasActiveChild && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveChild]);

  return (
    <div className={`sidebar-group${isOpen ? " sidebar-group--open" : ""}`}>
      <button
        className="sidebar-group__toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
      >
        <span className="sidebar-group__toggle-left">
          {GroupIcon && <GroupIcon size={14} />}
          {title}
        </span>
        <ChevronDown
          size={14}
          className={`sidebar-group__chevron${isOpen ? " sidebar-group__chevron--open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="sidebar-group__links">
          {items.map((item) => {
            const isActive = matchesPath(pathname, item.href);
            const Icon = getIconForHref(item.href);

            return (
              <Link
                className={`sidebar-link${isActive ? " sidebar-link--active" : ""}`}
                href={item.href}
                key={item.href}
                title={item.description}
              >
                {Icon && <Icon size={16} className="sidebar-link__icon" />}
                <span className="sidebar-link__label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
