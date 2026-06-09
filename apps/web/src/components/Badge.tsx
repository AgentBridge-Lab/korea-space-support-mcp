import type { ReactNode } from "react";

type Variant = "active" | "closed" | "upcoming" | "stale" | "urgent" | "defense" | "category" | "research" | "neutral";

export function Badge({ variant = "neutral", children }: { variant?: Variant; children: ReactNode }) {
  const cls = variant === "neutral" ? "badge" : `badge badge-${variant}`;
  return <span className={cls}>{children}</span>;
}
