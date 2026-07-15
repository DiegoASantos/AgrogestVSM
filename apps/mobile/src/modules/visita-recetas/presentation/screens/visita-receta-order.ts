const COADYUVANTE_ORDER: Record<string, number> = {
  "Corrector de pH": 2,
  Adherente: 4,
  Tensoactivo: 3,
  Antideriva: 5,
  "Aceite penetrante": 5,
  Antiespumante: 6
};

const FIXED_ORDEN_MEZCLA_ITEMS = new Set(["Agua"]);

export function generateOrdenMezcla(coadyuvanteNombres: string[]): string[] {
  const orden: string[] = ["Agua"];
  const sortedAdyuvantes = [...coadyuvanteNombres].sort(
    (a, b) => (COADYUVANTE_ORDER[a] ?? 99) - (COADYUVANTE_ORDER[b] ?? 99)
  );
  const pHItem = sortedAdyuvantes.find((n) => n === "Corrector de pH");
  if (pHItem) orden.push(pHItem);
  orden.push("Producto agroquimico");
  for (const name of sortedAdyuvantes) {
    if (name !== "Corrector de pH") {
      orden.push(name);
    }
  }
  return orden;
}

export function isOrdenMezclaFixedItem(item: string) {
  return FIXED_ORDEN_MEZCLA_ITEMS.has(item);
}

export function swapOrdenMezclaItems(
  ordenMezcla: string[],
  firstIndex: number,
  secondIndex: number
) {
  if (
    firstIndex === secondIndex ||
    firstIndex < 0 ||
    secondIndex < 0 ||
    firstIndex >= ordenMezcla.length ||
    secondIndex >= ordenMezcla.length
  ) {
    return ordenMezcla;
  }

  const next = [...ordenMezcla];
  const firstItem = next[firstIndex];
  next[firstIndex] = next[secondIndex];
  next[secondIndex] = firstItem;
  return next;
}
