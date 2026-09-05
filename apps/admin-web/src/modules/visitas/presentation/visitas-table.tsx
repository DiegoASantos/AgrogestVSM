"use client";

import Link from "next/link";

import {
  DataTable,
  type DataTableColumn,
  type DataTablePagination
} from "../../../shared/components/data-table";
import { formatDateOnly } from "../../../shared/utils/date-only";
import type { VisitaCampo } from "../types/visitas.types";

type VisitasTableProps = {
  items: VisitaCampo[];
  campaignLabels?: Map<string, string>;
  parcelaLabels?: Map<string, string>;
  parcelaContexts?: Map<string, { productorId: string; sectorId: string }>;
  productorLabels?: Map<string, string>;
  sectorLabels?: Map<string, string>;
  agronomistLabels?: Map<string, string>;
  showParcelaColumn?: boolean;
  showProducerAndSector?: boolean;
  getMapHref?: (visita: VisitaCampo) => string;
  pagination?: DataTablePagination;
};

export function VisitasTable({
  items,
  campaignLabels,
  parcelaLabels,
  parcelaContexts,
  productorLabels,
  sectorLabels,
  agronomistLabels,
  showParcelaColumn = true,
  showProducerAndSector = false,
  getMapHref,
  pagination
}: VisitasTableProps) {
  const columns: DataTableColumn<VisitaCampo>[] = [
    ...(showProducerAndSector
      ? [
          {
            key: "productor",
            header: "Productor",
            sortable: true,
            sortValue: (visita: VisitaCampo) => {
              const productorId = parcelaContexts?.get(visita.parcelaId)?.productorId;
              return productorId ? (productorLabels?.get(productorId) ?? "") : "";
            },
            cell: (visita: VisitaCampo) => {
              const productorId = parcelaContexts?.get(visita.parcelaId)?.productorId;
              const label = productorId ? productorLabels?.get(productorId) : undefined;

              return (
                <div className="table-copy">
                  <strong>{label ?? "Productor no disponible"}</strong>
                  <span>{formatDate(visita.visitDate)}</span>
                </div>
              );
            }
          } satisfies DataTableColumn<VisitaCampo>,
          {
            key: "sector",
            header: "Sector",
            sortable: true,
            sortValue: (visita: VisitaCampo) => {
              const sectorId = parcelaContexts?.get(visita.parcelaId)?.sectorId;
              return sectorId ? (sectorLabels?.get(sectorId) ?? "") : "";
            },
            cell: (visita: VisitaCampo) => {
              const sectorId = parcelaContexts?.get(visita.parcelaId)?.sectorId;
              const label = sectorId ? sectorLabels?.get(sectorId) : undefined;

              return (
                label ?? <span className="lookup-fallback">Sector no disponible</span>
              );
            }
          } satisfies DataTableColumn<VisitaCampo>
        ]
      : [
          {
            key: "ficha",
            header: "Visita",
            sortable: true,
            sortValue: (visita: VisitaCampo) => visita.visitDate,
            cell: (visita: VisitaCampo) => (
              <div className="table-copy">
                <strong>{visita.nroFicha?.trim() || visita.publicId}</strong>
                <span>{formatDate(visita.visitDate)}</span>
              </div>
            )
          } satisfies DataTableColumn<VisitaCampo>
        ]),
    ...(showParcelaColumn && !showProducerAndSector
      ? [
          {
            key: "parcela",
            header: "Parcela",
            cell: (visita: VisitaCampo) => {
              const label = parcelaLabels?.get(visita.parcelaId);

              return label ? (
                label
              ) : (
                <span className="lookup-fallback">Parcela #{visita.parcelaId}</span>
              );
            }
          } satisfies DataTableColumn<VisitaCampo>
        ]
      : []),
    {
      key: "campania",
      header: "Campaña",
      sortable: true,
      sortValue: (visita) => campaignLabels?.get(visita.campaignId) ?? "",
      cell: (visita) => {
        const label = campaignLabels?.get(visita.campaignId);

        return label ? (
          label
        ) : (
          <span className="lookup-fallback">Campaña #{visita.campaignId}</span>
        );
      }
    },
    {
      key: "agronomo",
      header: "Agrónomo",
      sortable: true,
      sortValue: (visita) => agronomistLabels?.get(visita.agronomistUserId) ?? "",
      cell: (visita) => {
        const label = agronomistLabels?.get(visita.agronomistUserId);

        return label ? (
          label
        ) : (
          <span className="lookup-fallback">Usuario #{visita.agronomistUserId}</span>
        );
      }
    },
    {
      key: "horario",
      header: "Horario",
      cell: (visita) =>
        `${formatTime(visita.startVisitTime)}${visita.endVisitTime ? ` - ${formatTime(visita.endVisitTime)}` : ""}`
    },
    {
      key: "estado",
      header: "Estado",
      sortable: true,
      sortValue: (visita) => (visita.isActive ? 1 : 0),
      cell: (visita) => (
        <span className={`table-badge ${visita.isActive ? "" : "table-badge--muted"}`}>
          {visita.isActive ? "Activa" : "Inactiva"}
        </span>
      )
    },
    {
      key: "actions",
      header: "Acciones",
      className: "data-table__actions",
      cell: (visita) => (
        <div className="table-actions">
          <Link
            className="ui-button ui-button--secondary ui-button--compact"
            href={`/visitas/${visita.id}`}
          >
            Ver detalle
          </Link>
          {getMapHref ? (
            <Link
              className="ui-button ui-button--ghost ui-button--compact"
              href={getMapHref(visita)}
            >
              Ver mapa
            </Link>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <DataTable
      caption="Listado administrativo de visitas de campo."
      columns={columns}
      getRowKey={(row) => row.id}
      pagination={pagination}
      rows={items}
    />
  );
}

function formatDate(value: string) {
  return formatDateOnly(value);
}

function formatTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 5);
}
