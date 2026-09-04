import { redirect } from "next/navigation";

import { adminRoutes } from "../../../shared/constants/site";

export default function ReportesPage() {
  redirect(adminRoutes.reportesItems.visitas);
}
