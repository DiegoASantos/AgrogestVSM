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
    label: "Productos",
    href: adminRoutes.mantenimientoItems.productos,
    description: "Catalogo de productos"
  },
  {
    label: "Ingredientes activos",
    href: adminRoutes.mantenimientoItems.ingredientesActivos,
    description: "Base de ingredientes activos"
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
    label: "Formulaciones",
    href: adminRoutes.mantenimientoItems.productoIngredientes,
    description: "Relacion entre productos e ingredientes"
  },
  {
    label: "Sectores",
    href: adminRoutes.mantenimientoItems.sectores,
    description: "Base territorial"
  },
  {
    label: "Tipos de documento",
    href: adminRoutes.mantenimientoItems.tiposDocumento,
    description: "Catalogo documental"
  }
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
