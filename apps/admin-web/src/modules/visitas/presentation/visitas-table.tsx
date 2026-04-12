"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "../../../shared/components/data-table";
import type { VisitaCampo } from "../types/visitas.types";

type VisitasTableProps = {
  items: VisitaCampo[];
  campaignLabels?: Map<string, string>;
  parcelaLabels?: Map<string, string>;
  agronomistLabels?: Map<string, string>;
  showParcelaColumn?: boolean;
  getMapHref?: (visita: VisitaCampo) => string;
};

export function VisitasTable({
  items,
  campaignLabels,
  parcelaLabels,
  agronomistLabels,
  showParcelaColumn = true,
  getMapHref
}: VisitasTableProps) {
  const columns: DataTableColumn<VisitaCampo>[] = [
    {
      key: "ficha",
      header: "Visita",
      cell: (visita) => (
        <div className="table-copy">
          <strong>{visita.nroFicha?.trim() || visita.publicId}</strong>
          <span>{formatDate(visita.visitDate)}</span>
        </div>
      )
    },
    ...(showParcelaColumn
      ? [
          {
            key: "parcela",
            header: "Parcela",
            cell: (visita: VisitaCampo) =>
              parcelaLabels?.get(visita.parcelaId) ?? `Parcela #${visita.parcelaId}`
          } satisfies DataTableColumn<VisitaCampo>
        ]
      : []),
    {
      key: "campania",
      header: "Campania",
      cell: (visita) =>
        campaignLabels?.get(visita.campaignId) ?? `Campania #${visita.campaignId}`
    },
    {
      key: "agronomo",
      header: "Agronomo",
      cell: (visita) =>
        agronomistLabels?.get(visita.agronomistUserId) ?? `Usuario #${visita.agronomistUserId}`
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
          <Link className="ui-button ui-button--secondary ui-button--compact" href={`/visitas/${visita.id}`}>
            Ver detalle
          </Link>
          {getMapHref ? (
            <Link className="ui-button ui-button--ghost ui-button--compact" href={getMapHref(visita)}>
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
      rows={items}
    />
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 5);
}
