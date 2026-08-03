export type NivelRiesgo = "evitar" | "precaucion";

type GrupoCoincidencia = {
  etiqueta: string;
  nombres: string[];
};

export type ReglaIncompatibilidad = {
  id: string;
  nivel: NivelRiesgo;
  productos: string[];
  grupos: GrupoCoincidencia[];
  productosAusentes?: string[];
  etiquetaAusencia?: string;
  motivo: string;
  efecto: string;
  recomendacion: string;
};

export type AdvertenciaMezcla = {
  id: string;
  nivel: NivelRiesgo;
  productos: string[];
  condicion?: string;
  motivo: string;
  efecto: string;
  recomendacion: string;
};

export const DISCLAIMER_MEZCLA =
  "Esta validación es orientativa. Consulte siempre las etiquetas de los productos. La decisión final es del profesional responsable.";

export const REGLAS_INCOMPATIBILIDAD: ReglaIncompatibilidad[] = [
  {
    id: "cobre-acido",
    nivel: "evitar",
    productos: ["Oxicloruro de Cobre", "Ácido orgánico + indicador"],
    grupos: [grupo("Oxicloruro de Cobre"), grupo("Ácido orgánico + indicador")],
    motivo: "El pH ácido puede solubilizar el cobre en exceso.",
    efecto: "Fitotoxicidad: quemado de hojas, flores y frutos.",
    recomendacion: "Aplicar en mezclas separadas con al menos 3 días de diferencia."
  },
  {
    id: "cobre-zinc",
    nivel: "evitar",
    productos: ["Oxicloruro de Cobre", "Zinc Quelatado / Basfoliar Zinc / Kelatox Zinc"],
    grupos: [
      grupo("Oxicloruro de Cobre"),
      grupo("Zinc Quelatado", "Basfoliar Zinc", "Kelatox Zinc")
    ],
    motivo: "El cobre desplaza el zinc del quelato.",
    efecto:
      "Ambos productos pueden precipitar y dejar de estar disponibles para la planta.",
    recomendacion: "Aplicar el zinc 7 días antes o después del cobre."
  },
  {
    id: "glifosato-cationes",
    nivel: "evitar",
    productos: ["Glifosato", "Calcio / Magnesio / Zinc"],
    grupos: [
      grupo("Glifosato"),
      grupo(
        "Nitrato de Calcio",
        "Yaraliva Calcinit",
        "Sulfato de Magnesio",
        "Sulfato Magnesio",
        "Basfoliar Zinc",
        "Kelatox Zinc",
        "Zinc Quelatado"
      )
    ],
    motivo: "El Calcio, Magnesio o Zinc puede secuestrar el glifosato.",
    efecto: "El herbicida pierde eficacia y las malezas pueden no controlarse.",
    recomendacion:
      "Aplicar el glifosato solo, sin fertilizantes foliares en el mismo tanque."
  },
  {
    id: "calcio-sulfatos",
    nivel: "evitar",
    productos: ["Nitrato de Calcio / Yaraliva Calcinit", "Sulfatos"],
    grupos: [
      grupo("Nitrato de Calcio", "Yaraliva Calcinit"),
      grupo("Sulfato de Potasio", "Sulfato de Magnesio", "Sulfato Magnesio")
    ],
    motivo: "El Calcio y los sulfatos pueden formar yeso.",
    efecto: "Precipitado blanco y posible obstrucción de boquillas y filtros.",
    recomendacion: "Preparar y aplicar en mezclas separadas."
  },
  {
    id: "calcio-fosfatos",
    nivel: "evitar",
    productos: ["Nitrato de Calcio / Yaraliva Calcinit", "DAP / Fósforo + Nitrógeno"],
    grupos: [
      grupo("Nitrato de Calcio", "Yaraliva Calcinit"),
      grupo("DAP", "Fósforo + Nitrógeno")
    ],
    motivo: "El Calcio y el fosfato pueden formar fosfato de calcio.",
    efecto: "El Calcio y el Fósforo dejan de estar disponibles para la planta.",
    recomendacion: "Aplicar con al menos 5 días de diferencia."
  },
  {
    id: "zinc-fosfatos",
    nivel: "evitar",
    productos: [
      "Zinc Quelatado / Basfoliar Zinc / Kelatox Zinc",
      "DAP / Fósforo + Nitrógeno"
    ],
    grupos: [
      grupo("Zinc Quelatado", "Basfoliar Zinc", "Kelatox Zinc"),
      grupo("DAP", "Fósforo + Nitrógeno")
    ],
    motivo: "El Zinc y el fosfato pueden formar fosfato de zinc.",
    efecto: "El Zinc y el Fósforo precipitan y pueden inducir una deficiencia.",
    recomendacion: "Aplicar el zinc foliar solo, sin fosfatos en el mismo tanque."
  },
  {
    id: "abamectina-sin-secuestrante",
    nivel: "precaucion",
    productos: ["Abamectina"],
    grupos: [grupo("Abamectina")],
    productosAusentes: ["Secuestrante de sales"],
    motivo: "El pH alcalino del agua dura puede degradar la abamectina.",
    efecto: "Reducción de eficacia contra ácaros.",
    recomendacion: "Agregar Secuestrante de sales primero y verificar un pH entre 5 y 7."
  },
  {
    id: "imidacloprid-sin-corrector",
    nivel: "precaucion",
    productos: ["Imidacloprid"],
    grupos: [grupo("Imidacloprid")],
    productosAusentes: ["Corrector de pH", "Ácido orgánico + indicador", "Buffer P.H."],
    etiquetaAusencia: "Corrector de pH",
    motivo: "Un pH alcalino puede reducir la absorción foliar.",
    efecto: "Menor control de insectos chupadores.",
    recomendacion:
      "Ajustar el pH a 5-6 con Corrector de pH antes de agregar Imidacloprid."
  },
  {
    id: "spinetoram-aceite",
    nivel: "precaucion",
    productos: ["Spinetoram", "Aceite penetrante"],
    grupos: [grupo("Spinetoram"), grupo("Aceite penetrante")],
    motivo: "La combinación puede producir un exceso de penetración en los tejidos.",
    efecto:
      "Fitotoxicidad en hojas tiernas de mango, especialmente sobre 30 grados Celsius.",
    recomendacion:
      "Reducir la dosis del aceite o evitar la aplicación en horas de calor intenso."
  },
  {
    id: "cobre-thiabendazole",
    nivel: "precaucion",
    productos: ["Oxicloruro de Cobre", "Thiabendazole"],
    grupos: [grupo("Oxicloruro de Cobre"), grupo("Thiabendazole")],
    motivo: "Puede existir interacción entre el benzimidazol y el cobre.",
    efecto: "Precipitación y reducción de eficacia de ambos fungicidas.",
    recomendacion:
      "Aplicar en mezclas separadas y verificar la etiqueta antes de una prueba de jarra."
  },
  {
    id: "paclobutrazol-nitrogeno",
    nivel: "precaucion",
    productos: ["Paclobutrazol", "Nitrógeno (Urea) / Urea Agrícola"],
    grupos: [grupo("Paclobutrazol"), grupo("Nitrógeno (Urea)", "Urea Agrícola")],
    motivo: "El Nitrógeno estimula el crecimiento y el Paclobutrazol lo inhibe.",
    efecto: "Los efectos contrapuestos pueden reducir el resultado esperado.",
    recomendacion:
      "Aplicar Paclobutrazol al suelo y no mezclarlo de forma foliar con urea."
  },
  {
    id: "fluopyram-sin-corrector",
    nivel: "precaucion",
    productos: ["Fluopyram"],
    grupos: [grupo("Fluopyram")],
    productosAusentes: ["Corrector de pH", "Ácido orgánico + indicador", "Buffer P.H."],
    etiquetaAusencia: "Corrector de pH",
    motivo: "El ingrediente puede hidrolizarse en un medio alcalino.",
    efecto: "Reducción de eficacia contra nematodos.",
    recomendacion: "Ajustar el pH a 5-6 con Corrector de pH antes de agregar Fluopyram."
  }
];

export function validarMezcla(nomenclatura: string[]): AdvertenciaMezcla[] {
  const nombresPresentes = new Set(
    nomenclatura.map(normalizarNombreProducto).filter(Boolean)
  );

  return REGLAS_INCOMPATIBILIDAD.filter((regla) => {
    const gruposPresentes = regla.grupos.every((grupoCoincidencia) =>
      grupoCoincidencia.nombres.some((nombre) =>
        nombresPresentes.has(normalizarNombreProducto(nombre))
      )
    );
    const productoExcluyentePresente = (regla.productosAusentes ?? []).some((nombre) =>
      nombresPresentes.has(normalizarNombreProducto(nombre))
    );

    return gruposPresentes && !productoExcluyentePresente;
  }).map(
    ({
      id,
      nivel,
      productos,
      productosAusentes,
      etiquetaAusencia,
      motivo,
      efecto,
      recomendacion
    }) => ({
      id,
      nivel,
      productos,
      condicion: productosAusentes?.length
        ? `Sin ${etiquetaAusencia ?? productosAusentes.join(" ni ")}`
        : undefined,
      motivo,
      efecto,
      recomendacion
    })
  );
}

export function construirMensajeAdvertencia(advertencias: AdvertenciaMezcla[]): string {
  if (advertencias.length === 0) return "";

  const detalle = advertencias
    .map((advertencia, index) => {
      const nivel =
        advertencia.nivel === "evitar" ? "\u{1F534} EVITAR" : "\u{1F7E1} PRECAUCIÓN";

      return [
        `${index + 1}. ${nivel}`,
        `Productos: ${advertencia.productos.join(" + ")}`,
        advertencia.condicion ? `Condición: ${advertencia.condicion}` : null,
        `Motivo: ${advertencia.motivo}`,
        `Efecto posible: ${advertencia.efecto}`,
        `Recomendación: ${advertencia.recomendacion}`
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
    })
    .join("\n\n");

  return `${detalle}\n\nAplique los productos en mezclas separadas cuando se indique.\n\n${DISCLAIMER_MEZCLA}`;
}

function grupo(...nombres: string[]): GrupoCoincidencia {
  return { etiqueta: nombres.join(" / "), nombres };
}

function normalizarNombreProducto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/gu, " ");
}
