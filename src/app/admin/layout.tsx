import type { Metadata } from "next";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { AdminGate, AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ dict }, user] = await Promise.all([getDictionary(), getCurrentUser()]);

  if (!user) return <AdminGate mode="signin" dict={dict} />;
  if (!isAdmin(user)) return <AdminGate mode="forbidden" dict={dict} />;

  return <AdminShell>{children}</AdminShell>;
}
