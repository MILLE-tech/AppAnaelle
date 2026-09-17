import { type InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "@/lib/utils/clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-xl border border-surface-border bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted/70",
          "outline-none transition-colors focus:border-accent/60 focus:bg-white/[0.05]",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx("mb-1.5 block text-sm font-medium text-muted", className)}
      {...props}
    />
  );
}
