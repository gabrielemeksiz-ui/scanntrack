"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, ClipboardList, Building2, BookOpen, LayoutDashboard, LogOut } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/scan", label: "Scanner", icon: ScanLine },
  { href: "/bons", label: "Mes bons", icon: ClipboardList },
  { href: "/chantiers", label: "Chantiers", icon: Building2 },
  { href: "/catalogue", label: "R\u00e9f\u00e9rences", icon: BookOpen },
];

export default function NavBar() {
  const pathname = usePathname();

  // Pas de nav sur la page login
  if (pathname === "/auth/login") return null;

  return (
    <>
      {/* Barre fixe en haut pour desktop */}
      <header className="hidden md:flex items-center justify-between bg-[#1F3A5F] text-white px-6 py-3 shadow">
        <Link href="/dashboard" className="font-bold text-lg flex items-center gap-2">
          <ScanLine className="w-6 h-6" />
          ScannTrack
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
          <form action="/api/auth/signout" method="post" className="ml-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <LogOut className="w-4 h-4" />
              D\u00e9connexion
            </button>
          </form>
        </nav>
      </header>

      {/* Barre fixe en bas pour mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="flex items-center justify-around">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition ${
                  active
                    ? "text-[#1F3A5F]"
                    : "text-gray-400"
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
