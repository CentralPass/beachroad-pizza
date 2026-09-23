"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The QR table screen is a focused ordering surface: no marketing header,
// footer or pickup cart around it.
const BARE = ["/table"];

export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  if (BARE.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  return <>{children}</>;
}
