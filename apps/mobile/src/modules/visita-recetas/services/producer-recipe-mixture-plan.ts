import { formatDoseUnit } from "../domain/dose-unit-format";
import type { CoadyuvanteCatalogItem, VisitaRecetaCompleta } from "../types";

export type ProducerMixtureRow = {
  dose: string;
  item: string;
  mixtureNumber: number | null;
  order: number;
};

type ProducerMixtureItem = Pick<ProducerMixtureRow, "dose" | "item">;
type ProducerMixtureGroup = {
  mixtureNumber: number | null;
  rows: ProducerMixtureRow[];
};

export function buildProducerMixtureRows(
  receta: VisitaRecetaCompleta,
  coadyuvantes: CoadyuvanteCatalogItem[]
): ProducerMixtureRow[] {
  const rows = receta.mezclas
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .flatMap((mezcla) => {
      const fertilizers = receta.fertilizacion.filter(
        (item) => item.mezclaNumero === mezcla.numero
      );
      const items: ProducerMixtureItem[] = [
        ...mezcla.productos.map((producto) => ({
          item:
            producto.marcaProductoNombre ??
            producto.ingredienteActivoNombre ??
            "Producto sin nombre",
          dose:
            producto.dosisProducto === null
              ? "-"
              : `${producto.dosisProducto} ${formatDoseUnit(producto.unidadDosis, "cilindro")}`
        })),
        ...fertilizers.map((fertilizer) => ({
          item: fertilizer.fertilizanteNombre ?? "Fertilizante sin nombre",
          dose: formatDose(fertilizer.dosis, fertilizer.unidadDosis)
        })),
        ...buildCoadjuvantItems(mezcla, coadyuvantes)
      ];
      const orderedItems = orderProducerMixtureItems(
        parseJsonArray(mezcla.ordenMezcla ?? "[]"),
        items
      );

      return (orderedItems.length > 0 ? orderedItems : [{ item: "-", dose: "-" }]).map(
        (item, index) => ({
          ...item,
          mixtureNumber: mezcla.numero,
          order: index + 1
        })
      );
    });
  const mixtureNumbers = new Set(receta.mezclas.map((mezcla) => mezcla.numero));
  const unassignedFertilizers = receta.fertilizacion
    .filter(
      (item) =>
        typeof item.mezclaNumero !== "number" || !mixtureNumbers.has(item.mezclaNumero)
    )
    .map((item, index) => ({
      item: item.fertilizanteNombre ?? "Fertilizante sin nombre",
      dose: formatDose(item.dosis, item.unidadDosis),
      mixtureNumber: null,
      order: index + 1
    }));

  return [...rows, ...unassignedFertilizers];
}

export function renderProducerMixturePlan(
  receta: VisitaRecetaCompleta,
  coadyuvantes: CoadyuvanteCatalogItem[]
) {
  const rows = buildProducerMixtureRows(receta, coadyuvantes);

  if (rows.length === 0) {
    return "";
  }

  return `
    <h2>Mezclas y dosis</h2>
    <table class="mixture-plan-table">
      <thead>
        <tr><th>Mezcla</th><th>Productos y coadyuvantes (en orden)</th><th>Dosis</th></tr>
      </thead>
      <tbody>
        ${groupProducerMixtureRows(rows)
          .map((group) =>
            group.rows
              .map(
                (row, index) => `
                    <tr>
                      ${
                        index === 0
                          ? `<td class="mixture-plan-number" rowspan="${group.rows.length}">${group.mixtureNumber ?? "Sin mezcla"}</td>`
                          : ""
                      }
                      <td class="mixture-plan-item">${row.order}&deg; ${escapeHtml(row.item)}</td>
                      <td class="mixture-plan-dose">${escapeHtml(row.dose)}</td>
                    </tr>`
              )
              .join("")
          )
          .join("")}
      </tbody>
    </table>`;
}

function groupProducerMixtureRows(rows: ProducerMixtureRow[]): ProducerMixtureGroup[] {
  const groups: ProducerMixtureGroup[] = [];

  for (const row of rows) {
    const current = groups[groups.length - 1];

    if (current?.mixtureNumber === row.mixtureNumber) {
      current.rows.push(row);
    } else {
      groups.push({ mixtureNumber: row.mixtureNumber, rows: [row] });
    }
  }

  return groups;
}

function buildCoadjuvantItems(
  mezcla: VisitaRecetaCompleta["mezclas"][number],
  coadyuvantes: CoadyuvanteCatalogItem[]
): ProducerMixtureItem[] {
  const doses = parseJsonRecord(mezcla.coadyuvantesDosis);

  return parseJsonArray(mezcla.coadyuvantesIds ?? "[]").map((id) => ({
    item: coadyuvantes.find((coadyuvante) => coadyuvante.id === id)?.name ?? id,
    dose: doses[id]?.trim() || "-"
  }));
}

function orderProducerMixtureItems(
  order: string[],
  items: ProducerMixtureItem[]
): ProducerMixtureItem[] {
  const remaining = [...items];
  const ordered: ProducerMixtureItem[] = [];

  for (const label of order) {
    if (normalizeText(label) === "agua") continue;
    const index = remaining.findIndex(
      (item) => normalizeText(item.item) === normalizeText(label)
    );
    const matched = index >= 0 ? remaining.splice(index, 1)[0] : undefined;
    ordered.push(matched ?? { item: label, dose: "-" });
  }

  return [...ordered, ...remaining];
}

function formatDose(value: number | null | undefined, unit: string | null | undefined) {
  return value === null || value === undefined
    ? "-"
    : [String(value), unit?.trim()].filter(Boolean).join(" ");
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: string | null | undefined): Record<string, string> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
