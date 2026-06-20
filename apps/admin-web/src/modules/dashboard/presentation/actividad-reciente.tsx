"use client";

import { Calendar, ClipboardList, User } from "lucide-react";
import type { VisitaReciente } from "../types/dashboard.types";

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

export function ActividadReciente({
  ultimasVisitas
}: {
  ultimasVisitas: VisitaReciente[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardList className="size-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Ultimas visitas registradas
        </h3>
      </div>
      {ultimasVisitas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <ClipboardList className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay visitas registradas.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {ultimasVisitas.map((v) => (
            <div
              className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              key={v.id}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ClipboardList className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {v.parcela}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {formatFecha(v.fecha)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <User className="size-3.5 shrink-0" />
                    <span className="truncate">{v.agronomo}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
