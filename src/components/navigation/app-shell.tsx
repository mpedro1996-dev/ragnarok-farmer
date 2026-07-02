"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { navigationItems } from "./navigation-config";
import { CloseIcon, MenuIcon } from "./rpg-nav-icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentNavigationItem = useMemo(
    () => navigationItems.find((item) => isRouteActive(pathname, item.href)) ?? navigationItems[0],
    [pathname],
  );

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="flex min-h-screen">
        <DesktopSidebar pathname={pathname} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <MobileTopBar
            currentLabel={currentNavigationItem.label}
            onOpenMenu={() => setIsMobileMenuOpen(true)}
          />

          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>

      <MobileSidebar
        isOpen={isMobileMenuOpen}
        pathname={pathname}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#08101f_0%,#0f172a_45%,#111827_100%)] text-slate-100 shadow-[24px_0_80px_rgba(15,23,42,0.18)] lg:flex">
      <div className="flex h-full w-full flex-col">
        <SidebarBranding />

        <nav className="flex-1 overflow-y-auto px-4 pb-5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Navegação
          </p>

          <div className="mt-4 space-y-2">
            {navigationItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}

function MobileTopBar({
  currentLabel,
  onOpenMenu,
}: {
  currentLabel: string;
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Ragnarok Farmer
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{currentLabel}</p>
      </div>

      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] transition hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--border-focus)]"
        aria-label="Abrir menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

function MobileSidebar({
  isOpen,
  pathname,
  onClose,
}: {
  isOpen: boolean;
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div
      className={[
        "fixed inset-0 z-50 transition lg:hidden",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className={[
          "absolute inset-0 bg-slate-950/55 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
        aria-label="Fechar menu"
      />

      <aside
        className={[
          "relative flex h-full w-[min(88vw,320px)] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#08101f_0%,#0f172a_45%,#111827_100%)] text-slate-100 shadow-[24px_0_80px_rgba(15,23,42,0.28)] transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Navegação
            </p>
            <p className="mt-1 text-lg font-semibold text-white">Menu do aventureiro</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/35"
            aria-label="Fechar menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
          </div>
        </nav>
      </aside>
    </div>
  );
}

function SidebarBranding() {
  return (
    <div className="border-b border-white/10 px-5 pb-6 pt-7">
      <div className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-4 shadow-[0_16px_48px_rgba(8,145,178,0.12)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.2)]">
            <div className="h-6 w-6 rounded-full border border-current" />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300">
              Ragnarok Farmer
            </p>
            <h1 className="mt-1 text-lg font-semibold text-white">Hub da guilda</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">
          Administração e operação diária com uma navegação persistente inspirada em RPG.
        </p>
      </div>
    </div>
  );
}

function SidebarNavItem({
  item,
  isActive,
  onNavigate,
}: {
  item: (typeof navigationItems)[number];
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={[
        "group flex items-center gap-3 rounded-[24px] border px-3 py-3 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/35",
        isActive
          ? "border-cyan-300/35 bg-cyan-400/12 text-white shadow-[0_10px_30px_rgba(34,211,238,0.12)]"
          : "border-transparent bg-white/0 text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition",
          isActive
            ? "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"
            : "border-white/10 bg-white/5 text-slate-300 group-hover:border-white/15 group-hover:bg-white/10 group-hover:text-cyan-100",
        ].join(" ")}
      >
        <Icon className="h-6 w-6" />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span
          className={[
            "mt-1 block text-xs leading-5",
            isActive ? "text-cyan-100/90" : "text-slate-400 group-hover:text-slate-300",
          ].join(" ")}
        >
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
