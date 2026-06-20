"use client";

import { ArrowDown, ArrowUp, ClipboardList, FileText, Sprout, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type KpiItem = {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: "default" | "success" | "warning" | "info";
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value);
}

const variantStyles: Record<
  KpiItem["variant"],
  { bg: string; iconBg: string; iconColor: string; valueColor: string; labelColor: string; dotColor: string }
> = {
  default: {
    bg: "bg-card",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueColor: "text-foreground",
    labelColor: "text-muted-foreground",
    dotColor: "bg-primary"
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    valueColor: "text-emerald-900 dark:text-emerald-100",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    dotColor: "bg-emerald-500"
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-400",
    valueColor: "text-amber-900 dark:text-amber-100",
    labelColor: "text-amber-700 dark:text-amber-400",
    dotColor: "bg-amber-500"
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconColor: "text-sky-700 dark:text-sky-400",
    valueColor: "text-sky-900 dark:text-sky-100",
    labelColor: "text-sky-700 dark:text-sky-400",
    dotColor: "bg-sky-500"
  }
};

export function KpiGrid({
  totalVisitas,
  visitasEsteMes,
  productoresActivos,
  recetasEmitidas
}: {
  totalVisitas: number;
  visitasEsteMes: number;
  productoresActivos: number;
  recetasEmitidas: number;
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
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const s = variantStyles[item.variant];
        return (
          <Card key={item.label} className={`${s.bg} border-0 shadow-sm`}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex size-10 items-center justify-center rounded-lg ${s.iconBg}`}>
                <span className={s.iconColor}>{item.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-2xl font-bold leading-none tracking-tight ${s.valueColor}`}>
                  {formatNumber(item.value)}
                </p>
                <p className={`mt-1 text-xs font-medium ${s.labelColor}`}>
                  {item.label}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
