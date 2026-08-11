import { adminRoutes } from "./site";

export type AdminNavLink = {
  label: string;
  href: string;
  description: string;
};

export const adminMainNavigation: AdminNavLink[] = [
  {
    label: "Dashboard",
    href: adminRoutes.dashboard,
    description: "Vista general del panel"
  },
  {
    label: "Visitas",
    href: adminRoutes.visitas,
    description: "Gestion de visitas de campo"
  },
  {
    label: "Mapas",
    href: adminRoutes.mapas,
    description: "Visualizacion geografica de parcelas y visitas"
  }
];

export const adminMaintenanceNavigation: AdminNavLink[] = [
  {
    label: "Cultivos",
    href: adminRoutes.mantenimientoItems.cultivos,
    description: "Catalogo de cultivos"
  },
  {
    label: "Campañas",
    href: adminRoutes.mantenimientoItems.campanias,
    description: "Campañas agrícolas"
  },
  {
    label: "Etapas fenologicas",
    href: adminRoutes.mantenimientoItems.etapasFenologicas,
    description: "Etapas por cultivo"
  },
  {
    label: "Sub etapas",
    href: adminRoutes.mantenimientoItems.subEtapas,
    description: "Detalle de etapas fenologicas"
  },
  {
    label: "Productores",
    href: adminRoutes.mantenimientoItems.productores,
    description: "Gestion base de productores"
  },
  {
    label: "Parcelas",
    href: adminRoutes.mantenimientoItems.parcelas,
    description: "Unidades de terreno por sector"
  },
  {
    label: "Niveles de incidencia y severidad",
    href: adminRoutes.mantenimientoItems.nivelesIncidencia,
    description: "Catalogo sanitario de incidencia y severidad"
  },
  {
    label: "Plagas y enfermedades",
    href: adminRoutes.mantenimientoItems.plagasEnfermedades,
    description: "Catalogo sanitario"
  },
  {
    label: "Plagas, etapas y niveles",
    href: adminRoutes.mantenimientoItems.plagasEnfermedadesEtapasNiveles,
    description: "Relaciones sanitarias por etapa"
  },
  {
    label: "Nutrientes",
    href: adminRoutes.mantenimientoItems.nutrientes,
    description: "Catalogo nutricional por cultivo"
  },
  {
    label: "Tipos de riego",
    href: adminRoutes.mantenimientoItems.tiposRiego,
    description: "Catalogo operativo de riego"
  },
  {
    label: "Labores culturales",
    href: adminRoutes.mantenimientoItems.laboresCulturales,
    description: "Catalogo operativo de labores"
  },
  {
    label: "Sectores",
    href: adminRoutes.mantenimientoItems.sectores,
    description: "Base territorial"
  },
  {
    label: "Subsectores",
    href: adminRoutes.mantenimientoItems.subsectores,
    description: "Subdivision territorial de sectores"
  },
  {
    label: "Tipos de documento",
    href: adminRoutes.mantenimientoItems.tiposDocumento,
    description: "Catalogo documental"
  }
];

export const adminClimateNavigation: AdminNavLink[] = [
  { label: "Resumen Agroclimático", href: adminRoutes.clima.resumen, description: "Condiciones territoriales" },
  { label: "Mapa agroclimático", href: adminRoutes.clima.mapa, description: "Puntos y estaciones" },
  { label: "Pronóstico", href: adminRoutes.clima.pronostico, description: "Condiciones futuras" },
  { label: "Historial Agroclimático", href: adminRoutes.clima.historial, description: "Series territoriales" },
  { label: "Estaciones meteorológicas", href: adminRoutes.clima.estaciones, description: "Inventario de estaciones" },
  { label: "Alertas climáticas", href: adminRoutes.clima.alertas, description: "Eventos meteorológicos" },
  { label: "Estado de fuentes de datos", href: adminRoutes.clima.fuentes, description: "Salud de proveedores" }
];

export const adminSecurityNavigation: AdminNavLink[] = [
  {
    label: "Usuarios",
    href: adminRoutes.seguridadItems.usuarios,
    description: "Gestion de usuarios"
  },
  {
    label: "Roles",
    href: adminRoutes.seguridadItems.roles,
    description: "Gestion de roles"
  },
  {
    label: "Asignacion de roles",
    href: adminRoutes.seguridadItems.usuarioRoles,
    description: "Relacion entre usuarios y roles"
  }
];

const allRoutes = [
  ...adminMainNavigation,
  ...adminClimateNavigation,
  ...adminMaintenanceNavigation,
  ...adminSecurityNavigation
];

export function resolveAdminRouteMeta(pathname: string) {
  const exactMatch = allRoutes.find((route) => route.href === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = [...allRoutes]
    .sort((leftRoute, rightRoute) => rightRoute.href.length - leftRoute.href.length)
    .find((route) => pathname.startsWith(`${route.href}/`));

  return (
    prefixMatch ?? {
      label: "Panel administrativo",
      href: pathname,
      description: "Navegacion base del panel administrativo."
    }
  );
}
