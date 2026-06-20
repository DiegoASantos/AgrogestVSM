"use client";

import { Calendar, ClipboardList, MapPin, Sprout, User } from "lucide-react";
import type { RecetaReciente, VisitaReciente } from "../types/dashboard.types";

function formatFecha(fecha: string): string {
  if (!fecha) return "-";
  try {
    const date = new Date(fecha.includes("T") ? fecha : `${fecha}T00:00:00`);
    if (Number.isNaN(date.getTime())) return fecha;
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      ...(fecha.includes(":") ? { hour: "2-digit", minute: "2-digit" } : {})
    });
  } catch {
    return fecha;
  }
}

function VisitaRow({ v }: { v: VisitaReciente }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <ClipboardList className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {v.parcela}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatFecha(v.fecha)}
          </span>
          <span className="flex items-center gap-1 truncate">
            <User className="size-3 shrink-0" />
            <span className="truncate">{v.agronomo}</span>
          </span>
        </div>
      </div>
    </li>
  );
}

function RecetaRow({ r }: { r: RecetaReciente }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
        <Sprout className="size-4 text-amber-700 dark:text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {r.parcela}
        </p>
        <p className="truncate text-xs text-emerald-700 dark:text-emerald-400">
          {r.etapa ?? "Sin etapa fenologica"}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatFecha(r.fecha)}
          </span>
        </div>
      </div>
    </li>
  );
}

export function ActividadReciente({
  ultimasVisitas,
  ultimasRecetas
}: {
  ultimasVisitas: VisitaReciente[];
  ultimasRecetas: RecetaReciente[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Ultimas visitas
        </h3>
        {ultimasVisitas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No hay visitas registradas.
          </p>
        ) : (
          <ul className="divide-y divide-border space-y-0">
            {ultimasVisitas.map((v) => (
              <VisitaRow key={v.id} v={v} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Ultimas recetas
        </h3>
        {ultimasRecetas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No hay recetas emitidas.
          </p>
        ) : (
          <ul className="divide-y divide-border space-y-0">
            {ultimasRecetas.map((r) => (
              <RecetaRow key={r.id} r={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
