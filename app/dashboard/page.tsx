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

  const [{ count: bonsToday }, { count: alertesActives }, { count: chantiers }] =
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
    ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Bonjour {profile.prenom}. Voici l&apos;activité du jour.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Bons validés aujourd'hui" value={bonsToday ?? 0} />
        <Stat
          label="Alertes stock actives"
          value={alertesActives ?? 0}
          highlight={(alertesActives ?? 0) > 0}
        />
        <Stat label="Chantiers actifs" value={chantiers ?? 0} />
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-bold mb-3">Prochaines étapes</h2>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>→ Page liste des bons (à implémenter Sprint 3)</li>
          <li>→ Page liste des chantiers avec coût cumulé</li>
          <li>→ Édition du catalogue des pièces</li>
          <li>→ Export Excel des mouvements</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow p-6 ${
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
    </div>
  );
}
