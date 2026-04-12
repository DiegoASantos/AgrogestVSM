import { DashboardHome } from "../modules/dashboard/presentation/dashboard-home";
import { PageShell } from "../shared/components/page-shell";

export default function HomePage() {
  return (
    <PageShell>
      <DashboardHome />
    </PageShell>
  );
}
