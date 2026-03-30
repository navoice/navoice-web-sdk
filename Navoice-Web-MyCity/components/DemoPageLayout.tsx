"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ActiveNav = "education" | "events" | "recycle" | "taxes";

type DemoPageLayoutProps = {
  title: string;
  activeNav: ActiveNav;
  children: React.ReactNode;
};

const navItems: Array<{ key: ActiveNav; label: string; href: string }> = [
  { key: "education", label: "Education", href: "/education" },
  { key: "events", label: "Events", href: "/events" },
  { key: "recycle", label: "Recycle", href: "/recycle" },
  { key: "taxes", label: "Taxes", href: "/taxes" },
];

function navClass(active: boolean) {
  return active
    ? "text-blue-600 dark:text-cyan-400 font-semibold"
    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white";
}

export default function DemoPageLayout({
  title,
  activeNav,
  children,
}: DemoPageLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={navClass(activeNav === item.key)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || activeNav === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`py-3 text-center text-sm ${
                  isActive
                    ? "text-blue-600 dark:text-cyan-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}