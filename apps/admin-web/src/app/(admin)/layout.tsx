import type { ReactNode } from "react";

import { AdminLayoutShell } from "../../shared/components/admin-layout-shell";

type AdminGroupLayoutProps = {
  children: ReactNode;
};

export default function AdminGroupLayout({ children }: AdminGroupLayoutProps) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
