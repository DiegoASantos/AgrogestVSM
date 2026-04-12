import { adminRoutes } from "../../../shared/constants/site";
import { ActionLink } from "../../../shared/components/action-link";

const featureCards = [
  {
    title: "Dashboard",
    description: "Resumen operativo con accesos rapidos a visitas, mapas y administracion."
  },
  {
    title: "Visitas",
    description: "Listado, detalle e historiales para revisar el trabajo de campo."
  },
  {
    title: "Mantenimiento y seguridad",
    description: "Catalogos, usuarios, roles y relaciones base del sistema."
  }
];

export function DashboardHome() {
  return (
    <section className="panel-grid panel-grid--two">
      <article className="panel panel--accent">
        <p className="eyebrow">AgroGest VSM</p>
        <h2 className="title">Panel administrativo operativo para control interno.</h2>
        <p className="body-copy">
          El panel ya separa autenticacion, dashboard, visitas, mapas, mantenimiento y
          seguridad en modulos utilizables.
        </p>

        <div className="actions">
          <ActionLink href={adminRoutes.dashboard} label="Abrir dashboard" />
          <ActionLink href={adminRoutes.login} label="Ir a login" variant="secondary" />
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">Estructura actual</p>
        <h2 className="title title--section">Cobertura funcional ya operativa.</h2>
        <ul className="feature-list">
          {featureCards.map((feature) => (
            <li className="feature-item" key={feature.title}>
              <strong>{feature.title}</strong>
              <span>{feature.description}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
