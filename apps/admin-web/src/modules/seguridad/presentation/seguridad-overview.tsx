import { adminSecurityNavigation } from "../../../shared/constants/admin-navigation";
import { adminRoutes } from "../../../shared/constants/site";
import { ActionLink } from "../../../shared/components/action-link";

export function SeguridadOverview() {
  return (
    <section className="panel-grid panel-grid--two">
      <article className="panel">
        <p className="eyebrow">Seguridad</p>
        <h2 className="title title--section">Gestion base de usuarios, roles y asignaciones.</h2>
        <p className="body-copy">
          El panel ya cuenta con mantenimiento simple de usuarios, roles y
          asignaciones usuario rol, sobre la autenticacion administrativa existente.
        </p>

        <div className="actions">
          <ActionLink href={adminRoutes.dashboard} label="Ir a dashboard" />
          <ActionLink
            href={adminRoutes.mantenimiento}
            label="Ir a mantenimiento"
            variant="ghost"
          />
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">Modulos disponibles</p>
        <h2 className="title title--section">Gestion de accesos</h2>
        <ul className="feature-list">
          {adminSecurityNavigation.map((item) => (
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
    </section>
  );
}
