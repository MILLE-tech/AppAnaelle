import { type HTMLAttributes } from "react";
import { clsx } from "@/lib/utils/clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("glass-card p-6", className)} {...props} />;
}
