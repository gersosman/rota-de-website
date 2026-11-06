import { AdminShell } from "@/components/admin/shell";
import { requirePanel } from "@/server/auth";

export const instant = false;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePanel();
  return <AdminShell name={admin.displayName}>{children}</AdminShell>;
}
