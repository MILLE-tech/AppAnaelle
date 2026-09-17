import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "@/lib/utils/clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "gradient-accent text-white shadow-lg shadow-accent/20 hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface-strong text-foreground border border-surface-border hover:bg-white/10",
  ghost: "text-muted hover:text-foreground hover:bg-white/5",
  danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
