import { LoginForm } from "../../modules/auth/presentation/login-form";
import { PageShell } from "../../shared/components/page-shell";

export default function LoginPage() {
  return (
    <PageShell>
      <LoginForm />
    </PageShell>
  );
}
