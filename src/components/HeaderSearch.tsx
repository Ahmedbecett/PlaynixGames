"use client";

import { usePathname } from "next/navigation";
import { SearchField } from "./SearchField";

export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/search" || pathname.startsWith("/play/") || pathname.startsWith("/admin")) return null;
  return <SearchField />;
}
