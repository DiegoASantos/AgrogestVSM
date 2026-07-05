export type JustificationReason = {
  id: string;
  label: string;
};

export type JustificationCategory = {
  id: string;
  label: string;
  motivos: JustificationReason[];
};

export const JUSTIFICACION_CATEGORIAS: JustificationCategory[] = [
  {
    id: "economicos",
    label: "Factores economicos y financieros",
    motivos: [
      { id: "falta_capital", label: "Falta de capital de trabajo" },
      { id: "costo_elevado", label: "Costo elevado del insumo" },
      { id: "falta_credito", label: "Falta de acceso a credito" }
    ]
  },
  {
    id: "recursos",
    label: "Disponibilidad de recursos y logistica",
    motivos: [
      { id: "desabastecimiento", label: "Desabastecimiento en el mercado" },
      { id: "falta_mano_obra", label: "Falta de mano de obra" },
      { id: "falta_maquinaria", label: "Falta de maquinaria/herramientas" },
      { id: "problemas_agua", label: "Problemas de agua" }
    ]
  },
  {
    id: "climaticos",
    label: "Factores climaticos y ambientales",
    motivos: [
      { id: "clima_adverso", label: "Clima adverso" },
      { id: "condiciones_suelo", label: "Condiciones del suelo/campo" }
    ]
  },
  {
    id: "tecnicos",
    label: "Aspectos tecnicos y de capacitacion",
    motivos: [
      { id: "complejidad_manejo", label: "Complejidad del manejo" },
      { id: "desacuerdo_tecnico", label: "Desacuerdo tecnico" },
      { id: "falta_tiempo", label: "Falta de tiempo / Olvido" }
    ]
  }
];
