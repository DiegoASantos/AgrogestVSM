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
    productos: "/mantenimiento/productos",
    ingredientesActivos: "/mantenimiento/ingredientes-activos",
    nivelesIncidencia: "/mantenimiento/niveles-incidencia-severidad",
    plagasEnfermedades: "/mantenimiento/plagas-enfermedades",
    productoIngredientes: "/mantenimiento/producto-ingredientes",
    sectores: "/mantenimiento/sectores",
    tiposDocumento: "/mantenimiento/tipos-documento"
  },
  seguridadItems: {
    usuarios: "/seguridad/usuarios",
    roles: "/seguridad/roles",
    usuarioRoles: "/seguridad/usuario-roles"
  }
} as const;
