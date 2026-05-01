import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, prenom")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "magasinier") {
    redirect("/scan");
  }

  // Quelques stats rapides
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ count: bonsToday }, { count: alertesActives }, { count: chantiers }, { count: totalPieces }] =
    await Promise.all([
      supabase
        .from("bons_sortie")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString())
        .eq("status", "valide"),
      supabase
        .from("alertes")
        .select("*", { count: "exact", head: true })
        .is("resolved_at", null),
      supabase
        .from("chantiers")
        .select("*", { count: "exact", head: true })
        .eq("archive", false),
      supabase
        .from("pieces")
        .select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Bonjour {profile.prenom}. Voici l&apos;activité du jour.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Bons validés aujourd'hui"
          value={bonsToday ?? 0}
          href="/bons"
        />
        <StatCard
          label="Alertes stock actives"
          value={alertesActives ?? 0}
          href="/catalogue"
          highlight={(alertesActives ?? 0) > 0}
        />
        <StatCard
          label="Chantiers actifs"
          value={chantiers ?? 0}
          href="/chantiers"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <LinkCard
          title="Nouveau bon de sortie"
          desc="Scanner des pièces et valider un bon"
          href="/scan"
          accent
        />
        <LinkCard
          title="Catalogue des pièces"
          desc={`${totalPieces ?? 0} références disponibles`}
          href="/catalogue"
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-bold mb-4">Navigation rapide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink href="/bons" label="📋 Liste des bons" desc="Historique et suivi" />
          <QuickLink href="/chantiers" label="🏗️ Chantiers" desc="Tous les projets" />
          <QuickLink href="/catalogue" label="📚 Catalogue" desc="Pièces et stocks" />
          <QuickLink href="/scan" label="📱 Scanner" desc="Créer un bon" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block bg-white rounded-2xl shadow p-6 hover:shadow-lg transition-shadow ${
        highlight ? "ring-2 ring-red-300" : ""
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`text-4xl font-bold mt-2 ${
          highlight ? "text-red-600" : "text-primary"
        }`}
      >
        {value}
      </p>
    </a>
  );
}

function LinkCard({
  title,
  desc,
  href,
  accent,
}: {
  title: string;
  desc: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block rounded-2xl p-6 hover:shadow-lg transition-shadow ${
        accent
          ? "bg-primary text-white shadow"
          : "bg-white shadow"
      }`}
    >
      <h3 className={`font-bold text-lg ${accent ? "" : "text-primary"}`}>
        {title} →
      </h3>
      <p className={`text-sm mt-1 ${accent ? "text-white/80" : "text-muted-foreground"}`}>
        {desc}
      </p>
    </a>
  );
}

function QuickLink({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <span className="text-muted-foreground">→</span>
    </a>
  );
}
