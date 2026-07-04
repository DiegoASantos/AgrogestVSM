"use client";

import { ArrowUp, ClipboardList, FileText, Gauge, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type KpiItem = {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  variant: "default" | "success" | "warning" | "info";
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value);
}

const variantStyles: Record<
  KpiItem["variant"],
  {
    bg: string;
    iconBg: string;
    iconColor: string;
    valueColor: string;
    labelColor: string;
    dotColor: string;
    border: string;
  }
> = {
  default: {
    bg: "bg-card/95",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueColor: "text-foreground",
    labelColor: "text-muted-foreground",
    dotColor: "bg-primary",
    border: "border-border/70"
  },
  success: {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    valueColor: "text-emerald-900 dark:text-emerald-100",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    border: "border-emerald-200/70 dark:border-emerald-900/70"
  },
  warning: {
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-400",
    valueColor: "text-amber-900 dark:text-amber-100",
    labelColor: "text-amber-700 dark:text-amber-400",
    dotColor: "bg-amber-500",
    border: "border-amber-200/70 dark:border-amber-900/70"
  },
  info: {
    bg: "bg-sky-50/80 dark:bg-sky-950/30",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconColor: "text-sky-700 dark:text-sky-400",
    valueColor: "text-sky-900 dark:text-sky-100",
    labelColor: "text-sky-700 dark:text-sky-400",
    dotColor: "bg-sky-500",
    border: "border-sky-200/70 dark:border-sky-900/70"
  }
};

export function KpiGrid({
  totalVisitas,
  visitasEsteMes,
  productoresActivos,
  recetasEmitidas,
  cumplimientoPromedio
}: {
  totalVisitas: number;
  visitasEsteMes: number;
  productoresActivos: number;
  recetasEmitidas: number;
  cumplimientoPromedio: number | null;
}) {
  const items: KpiItem[] = [
    {
      label: "Visitas totales",
      value: totalVisitas,
      icon: <ClipboardList className="size-5" />,
      variant: "default"
    },
    {
      label: "Este mes",
      value: visitasEsteMes,
      icon: <ArrowUp className="size-5" />,
      variant: "info"
    },
    {
      label: "Prod. activos",
      value: productoresActivos,
      icon: <Users className="size-5" />,
      variant: "success"
    },
    {
      label: "Recetas emitidas",
      value: recetasEmitidas,
      icon: <FileText className="size-5" />,
      variant: "warning"
    },
    {
      label: "Cumplimiento prom.",
      value: cumplimientoPromedio ?? 0,
      suffix: cumplimientoPromedio === null ? "" : "%",
      icon: <Gauge className="size-5" />,
      variant: "info"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {items.map((item) => {
        const s = variantStyles[item.variant];
        return (
          <Card
            key={item.label}
            className={`${s.bg} ${s.border} overflow-hidden shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <CardContent className="relative flex items-center gap-3 p-4">
              <span
                className={`absolute left-0 top-0 h-full w-1 ${s.dotColor}`}
                aria-hidden="true"
              />
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${s.iconBg}`}
              >
                <span className={s.iconColor}>{item.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-2xl font-bold leading-none tracking-tight ${s.valueColor}`}
                >
                  {formatNumber(item.value)}
                  {item.suffix ?? ""}
                </p>
                <p className={`mt-1 text-xs font-medium ${s.labelColor}`}>{item.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
