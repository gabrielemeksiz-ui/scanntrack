import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackButton from "@/components/back-button";

export default async function CataloguePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: pieces, error } = await supabase
    .from("pieces")
    .select("id, ref_interne, nom, categorie, unite, prix_unitaire, stock_actuel, seuil_alerte")
    .order("nom")
    .limit(200);

  if (error) {
    console.error("Erreur catalogue:", error);
  }

  const totalPieces = pieces?.length ?? 0;
  const enAlerte = pieces?.filter((p: any) => p.stock_actuel <= p.seuil_alerte).length ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackButton />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#1F3A5F]">Catalogue des pièces</h1>
        <div className="text-sm text-gray-500">
          {totalPieces} références
          {enAlerte > 0 && (
            <span className="ml-3 text-red-600 font-medium">
              {enAlerte} en alerte
            </span>
          )}
        </div>
      </div>

      {!pieces || pieces.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
          Aucune pièce dans le catalogue.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Code</th>
                  <th className="text-left p-4 font-medium">Désignation</th>
                  <th className="text-left p-4 font-medium">Catégorie</th>
                  <th className="text-left p-4 font-medium">Unité</th>
                  <th className="text-left p-4 font-medium">Prix</th>
                  <th className="text-left p-4 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((p: any) => {
                  const alerte = p.stock_actuel <= p.seuil_alerte;
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-mono text-xs">{p.ref_interne}</td>
                      <td className="p-4 font-medium">{p.nom}</td>
                      <td className="p-4 text-gray-500">{p.categorie || "—"}</td>
                      <td className="p-4">{p.unite || "—"}</td>
                      <td className="p-4">
                        {p.prix_unitaire ? `${p.prix_unitaire.toFixed(2)} €` : "—"}
                      </td>
                      <td className="p-4">
                        <span className={alerte ? "text-red-600 font-bold" : ""}>
                          {p.stock_actuel ?? 0}
                        </span>
                        {alerte && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            Alerte
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
