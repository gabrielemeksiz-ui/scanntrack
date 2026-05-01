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
      <h1 className="text-3xl font-bold text-[#1F3A5F] mb-2">Tableau de bord</h1>
      <p className="text-gray-500 mb-8">
        Bonjour {profile.prenom}. Voici le résumé de la journée.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Bons validés aujourd'hui"
          value={bonsToday ?? 0}
          href="/bons"
        />
        <StatCard
          label="Alertes stock"
          value={alertesActives ?? 0}
          href="/catalogue"
          highlight={(alertesActives ?? 0) > 0}
        />
        <StatCard
          label="Chantiers en cours"
          value={chantiers ?? 0}
          href="/chantiers"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <BigButton
          title="+ Nouveau bon de sortie"
          desc="Scanner des pièces pour un chantier"
          href="/scan"
          accent
        />
        <BigButton
          title="Voir le catalogue"
          desc={`${totalPieces ?? 0} références en stock`}
          href="/catalogue"
        />
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
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-4xl font-bold mt-2 ${
          highlight ? "text-red-600" : "text-[#1F3A5F]"
        }`}
      >
        {value}
      </p>
    </a>
  );
}

function BigButton({
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
      className={`block rounded-2xl p-6 text-center hover:shadow-lg transition-shadow ${
        accent
          ? "bg-[#1F3A5F] text-white shadow"
          : "bg-white shadow"
      }`}
    >
      <h3 className={`font-bold text-xl ${accent ? "" : "text-[#1F3A5F]"}`}>
        {title}
      </h3>
      <p className={`text-sm mt-2 ${accent ? "text-white/80" : "text-gray-500"}`}>
        {desc}
      </p>
    </a>
  );
}
