"use client";

import { Award, MapPinned, Sprout } from "lucide-react";
import { useState } from "react";

import type { ProductorRankingItem } from "../types/dashboard.types";

type RankingMode = "campania" | "general";

export function TopProductores({
  campaniaActual,
  general
}: {
  campaniaActual: { nombre: string | null; productores: ProductorRankingItem[] };
  general: ProductorRankingItem[];
}) {
  const [mode, setMode] = useState<RankingMode>(
    campaniaActual.nombre ? "campania" : "general"
  );
  const productores = mode === "campania" ? campaniaActual.productores : general;
  const label =
    mode === "campania"
      ? (campaniaActual.nombre ?? "Campaña actual")
      : "Histórico general";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-700">
            <Award className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Top productores</h3>
            <p className="text-xs text-muted-foreground">
              Score promedio de visitas evaluadas por parcela.
            </p>
          </div>
        </div>
        <div
          className="inline-flex w-fit rounded-lg bg-muted p-1"
          role="tablist"
          aria-label="Periodo del ranking"
        >
          <button
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === "campania" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            disabled={!campaniaActual.nombre}
            onClick={() => setMode("campania")}
            role="tab"
            type="button"
          >
            Campaña actual
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === "general" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("general")}
            role="tab"
            type="button"
          >
            General
          </button>
        </div>
      </div>
      <p className="rounded-md border border-primary/10 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{label}.</span> Se muestran hasta
        10 productores con score disponible.
      </p>
      {productores.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Sprout className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Aún no hay productores con visitas calificadas para este periodo.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border">
          {productores.map((productor, index) => (
            <li className="flex items-center gap-3 px-4 py-3" key={productor.productorId}>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index < 3 ? "bg-amber-400/20 text-amber-800" : "bg-muted text-muted-foreground"}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {productor.productorNombre}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPinned className="size-3" />
                  {productor.parcelasEvaluadas}{" "}
                  {productor.parcelasEvaluadas === 1 ? "parcela" : "parcelas"} ·{" "}
                  {productor.visitasCalificadas} visitas
                </p>
              </div>
              <div className="text-right">
                <strong className="text-lg font-bold text-primary">
                  {Math.round(productor.score)}%
                </strong>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  score
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
