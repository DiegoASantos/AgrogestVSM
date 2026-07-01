export const siteConfig = {
  name: "AgroGest VSM Admin",
  shortName: "Admin",
  description:
    "Panel administrativo para visitas, mapas, catalogos y seguridad operativa de AgroGest VSM."
} as const;

export const adminRoutes = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  visitas: "/visitas",
  mapas: "/mapas",
  mantenimiento: "/mantenimiento",
  seguridad: "/seguridad",
  mantenimientoItems: {
    cultivos: "/mantenimiento/cultivos",
    campanias: "/mantenimiento/campanias",
    etapasFenologicas: "/mantenimiento/etapas-fenologicas",
    subEtapas: "/mantenimiento/sub-etapas",
    productores: "/mantenimiento/productores",
    parcelas: "/mantenimiento/parcelas",
    nivelesIncidencia: "/mantenimiento/niveles-incidencia-severidad",
    plagasEnfermedades: "/mantenimiento/plagas-enfermedades",
    plagasEnfermedadesEtapasNiveles: "/mantenimiento/plagas-enfermedades-etapas-niveles",
    nutrientes: "/mantenimiento/nutrientes",
    tiposRiego: "/mantenimiento/tipos-riego",
    laboresCulturales: "/mantenimiento/labores-culturales",
    sectores: "/mantenimiento/sectores",
    subsectores: "/mantenimiento/subsectores",
    tiposDocumento: "/mantenimiento/tipos-documento"
  },
  seguridadItems: {
    usuarios: "/seguridad/usuarios",
    roles: "/seguridad/roles",
    usuarioRoles: "/seguridad/usuario-roles"
  }
} as const;
