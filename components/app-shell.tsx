"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  FileArchive,
  Gauge,
  LineChart,
  Menu,
  Settings,
  ShieldCheck,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/ceo", label: "CEO Cockpit", icon: BrainCircuit },
  { href: "/tenders", label: "Tender Feed", icon: BriefcaseBusiness },
  { href: "/ai-insights", label: "AI Insights", icon: ShieldCheck },
  { href: "/competitors", label: "Competitors", icon: Building2 },
  { href: "/financials", label: "Financials", icon: ChartNoAxesCombined },
  { href: "/documents", label: "Document Vault", icon: FileArchive },
  { href: "/alerts", label: "Alert Center", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings }
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onClose}
        className="mb-8 flex items-center gap-3 px-2"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand-500 text-white">
          <LineChart className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold leading-tight">TenderLens India</p>
          <p className="text-xs text-slate-500">CEO tender command</p>
        </div>
      </Link>
      <nav className="space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                active &&
                  "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const currentPage = nav.find((n) => n.href === pathname)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen overflow-x-hidden bg-cloud text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-68 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="min-w-0 lg:pl-68">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-cloud/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* Hamburger — mobile only */}
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  India public procurement intelligence
                </p>
                <p className="truncate text-base font-semibold leading-tight">
                  {currentPage}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Role badge */}
              <span className="hidden rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-50 sm:inline-flex">
                CEO
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
