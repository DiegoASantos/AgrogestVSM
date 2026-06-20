import type { ReactNode } from "react";

type SkeletonBlockProps = {
  className?: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`skeleton-block ${className ?? ""}`} aria-hidden="true" />;
}

export type TableSkeletonProps = {
  columns: number;
  rows?: number;
  description?: string;
};

export function TableSkeleton({
  columns,
  rows = 5,
  description
}: TableSkeletonProps) {
  const skeletonRows = Array.from({ length: rows }, (_, index) => index);
  const skeletonCols = Array.from({ length: columns }, (_, index) => index);

  return (
    <section className="state-card state-card--loading" role="status">
      <div className="loading-state__pulse" />
      <div className="loading-state__copy">
        <h3 className="title title--section">Cargando datos</h3>
        <p className="body-copy">{description ?? "Procesando la informacion solicitada."}</p>
      </div>
      <div
        className="skeleton-table"
        aria-hidden="true"
        style={{ "--skeleton-cols": columns } as React.CSSProperties}
      >
        <div className="skeleton-table__header">
          {skeletonCols.map((index) => (
            <SkeletonBlock key={`h-${index}`} className="skeleton-table__cell" />
          ))}
        </div>
        {skeletonRows.map((rowIndex) => (
          <div className="skeleton-table__row" key={`r-${rowIndex}`}>
            {skeletonCols.map((colIndex) => (
              <SkeletonBlock
                key={`c-${rowIndex}-${colIndex}`}
                className="skeleton-table__cell"
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export type DetailSkeletonProps = {
  fields?: number;
  description?: string;
  panels?: ReactNode;
};

export function DetailSkeleton({
  fields = 8,
  description,
  panels
}: DetailSkeletonProps) {
  const skeletonFields = Array.from({ length: fields }, (_, index) => index);

  return (
    <section className="panel-grid">
      <article className="panel">
        <div className="state-card__loading-pulse" aria-hidden="true">
          <div className="loading-state__pulse" />
        </div>
        <div className="loading-state__copy" style={{ marginBottom: 20 }}>
          <h3 className="title title--section">Cargando detalle</h3>
          <p className="body-copy">
            {description ?? "Obteniendo la informacion completa de la visita."}
          </p>
        </div>

        <div className="skeleton-grid" aria-hidden="true">
          {skeletonFields.map((index) => (
            <div className="skeleton-card" key={`f-${index}`}>
              <SkeletonBlock className="skeleton-card__label" />
              <SkeletonBlock className="skeleton-card__value" />
            </div>
          ))}
        </div>
        {panels}
      </article>
    </section>
  );
}
