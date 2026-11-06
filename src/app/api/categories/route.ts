import { json, route } from "@/lib/api";
import { listCategoriesWithCounts } from "@/lib/games";
import { getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const locale = await getLocale();
  const categories = await listCategoriesWithCounts(locale);
  return json({ categories });
});
