import { ProfileForm } from "../../../modules/auth/components/profile-form";
import { FormCard } from "../../../shared/components/form-card";

export default function PerfilPage() {
  return (
    <section className="panel-grid">
      <FormCard
        title="Mi perfil"
        description="Actualiza tus datos personales y cambia tu contrasena."
      >
        <ProfileForm />
      </FormCard>
    </section>
  );
}
