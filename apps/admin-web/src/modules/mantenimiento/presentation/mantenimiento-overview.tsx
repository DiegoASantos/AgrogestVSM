import { adminMaintenanceNavigation } from "../../../shared/constants/admin-navigation";
import { adminRoutes } from "../../../shared/constants/site";
import { ActionLink } from "../../../shared/components/action-link";

export function MantenimientoOverview() {
  return (
    <section className="panel-grid">
      <div className="panel-grid panel-grid--two">
        <article className="panel">
          <p className="eyebrow">Mantenimiento</p>
          <h2 className="title title--section">Catalogos y mantenimiento operativo.</h2>
          <p className="body-copy">
            Aqui se concentran los catalogos agricolas, la base territorial y las
            relaciones administrativas que ya estan operativas en el panel.
          </p>

          <div className="actions">
            <ActionLink href={adminRoutes.dashboard} label="Ir a dashboard" />
            <ActionLink href={adminRoutes.visitas} label="Ir a visitas" variant="ghost" />
            <ActionLink href={adminRoutes.seguridad} label="Ir a seguridad" variant="ghost" />
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Modulos disponibles</p>
          <h2 className="title title--section">Catalogos base</h2>
          <ul className="feature-list">
            {adminMaintenanceNavigation.map((item) => (
              <li className="feature-item" key={item.href}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
                <div className="actions">
                  <ActionLink href={item.href} label="Abrir" variant="secondary" />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
