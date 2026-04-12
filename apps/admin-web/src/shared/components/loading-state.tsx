type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = "Cargando informacion",
  description = "Estamos procesando la informacion solicitada."
}: LoadingStateProps) {
  return (
    <section className="state-card state-card--loading" role="status">
      <div className="loading-state__pulse" />
      <div className="loading-state__copy">
        <h3 className="title title--section">{title}</h3>
        <p className="body-copy">{description}</p>
      </div>
    </section>
  );
}
