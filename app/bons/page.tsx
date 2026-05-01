import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, prenom, nom")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  const isAdmin = profile.role === "admin" || profile.role === "magasinier";

  let query = supabase
    .from("bons_sortie")
    .select("*, bon_lignes(count), profiles(prenom, nom)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data: bons, error } = await query;

  if (error) {
    console.error("Erreur chargement bons:", error);
  }

  const statusLabel: Record<string, string> = {
    brouillon: "Brouillon",
    valide: "Validé",
    annule: "Annulé",
  };

  const statusColor: Record<string, string> = {
    brouillon: "bg-gray-100 text-gray-700",
    valide: "bg-green-100 text-green-700",
    annule: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">Bons de sortie</h1>
        <Link
          href="/scan"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
          + Nouveau bon
        </Link>
      </div>

      {!bons || bons.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-muted-foreground">
          Aucun bon de sortie pour le moment.
          <div className="mt-4">
            <Link href="/scan" className="text-primary hover:underline">
              Créer un premier bon →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">N°</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Chantier</th>
                <th className="text-left p-4 font-medium">Chef d&apos;équipe</th>
                <th className="text-left p-4 font-medium">Lignes</th>
                <th className="text-left p-4 font-medium">Statut</th>
                <th className="text-left p-4 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {bons.map((bon: any) => (
                <tr key={bon.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs">{bon.id.slice(0, 8)}</td>
                  <td className="p-4">
                    {new Date(bon.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-4">{bon.chantier_nom || "—"}</td>
                  <td className="p-4">
                    {bon.profiles?.prenom} {bon.profiles?.nom}
                  </td>
                  <td className="p-4">{bon.bon_lignes?.[0]?.count ?? 0}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[bon.status] || "bg-gray-100"}`}>
                      {statusLabel[bon.status] || bon.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {bon.pdf_url ? (
                      <a
                        href={bon.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Voir PDF
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
