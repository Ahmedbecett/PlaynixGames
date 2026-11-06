import { json, requireAdmin, route } from "@/lib/api";
import { getDashboardStats } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return json(await getDashboardStats());
});
