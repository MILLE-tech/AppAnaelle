"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/utils/clsx";
import { logout } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/matieres", label: "Matières", icon: BookIcon },
  { href: "/calendrier", label: "Calendrier", icon: CalendarIcon },
];

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0 md:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-surface-border bg-background-elevated/60 p-6 md:flex">
        <Link href="/dashboard" className="mb-10 text-2xl font-semibold">
          <span className="gradient-text">AppAnaelle</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
        </nav>
        <div className="border-t border-surface-border pt-4">
          <p className="mb-2 truncate text-xs text-muted">{userEmail}</p>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-muted transition-colors hover:text-danger"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border bg-background/80 px-4 py-3 backdrop-blur-lg md:hidden">
        <span className="text-xl font-semibold">
          <span className="gradient-text">AppAnaelle</span>
        </span>
        <form action={logout}>
          <button type="submit" className="text-xs font-medium text-muted hover:text-danger">
            Déconnexion
          </button>
        </form>
      </header>

      <main className="flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-surface-border bg-background-elevated/90 backdrop-blur-lg md:hidden">
        {NAV_ITEMS.map((item) => (
          <MobileNavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>
    </div>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent-soft text-foreground"
          : "text-muted hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}

function MobileNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted"
      )}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 11.5 12 4l8 7.5M6 9.5V20h5v-6h2v6h5V9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 4.5h9a3 3 0 0 1 3 3V20a2 2 0 0 0-2-1.5H5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 18.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
