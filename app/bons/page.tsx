import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/back-button";

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
    brouillon: "En cours",
    valide: "Validé",
    annule: "Annulé",
  };

  const statusColor: Record<string, string> = {
    brouillon: "bg-yellow-100 text-yellow-800",
    valide: "bg-green-100 text-green-800",
    annule: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackButton />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#1F3A5F]">Mes bons de sortie</h1>
        <Link
          href="/scan"
          className="bg-[#1F3A5F] text-white px-5 py-3 rounded-xl hover:bg-[#152a45] transition font-medium"
        >
          + Nouveau bon
        </Link>
      </div>

      {!bons || bons.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
          <p className="text-lg mb-2">Aucun bon pour le moment.</p>
          <p className="text-sm mb-4">Créez un bon en scannant des pièces.</p>
          <Link href="/scan" className="text-[#1F3A5F] hover:underline font-medium">
            Créer un premier bon →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Chantier</th>
                  <th className="text-left p-4 font-medium">Chef</th>
                  <th className="text-left p-4 font-medium">Pièces</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {bons.map((bon: any) => (
                  <tr key={bon.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      {new Date(bon.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-4 font-medium">{bon.chantier_nom || "—"}</td>
                    <td className="p-4">
                      {bon.profiles?.prenom} {bon.profiles?.nom}
                    </td>
                    <td className="p-4">{bon.bon_lignes?.[0]?.count ?? 0}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[bon.status] || "bg-gray-100"}`}>
                        {statusLabel[bon.status] || bon.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {bon.pdf_url ? (
                        <a
                          href={bon.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1F3A5F] hover:underline font-medium"
                        >
                          Voir le PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
