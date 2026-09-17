type ClassValue = string | number | null | boolean | undefined;

export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
