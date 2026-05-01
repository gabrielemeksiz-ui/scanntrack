import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackButton from "@/components/back-button";

export default async function ChantiersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");
  if (profile.role !== "admin" && profile.role !== "magasinier") {
    redirect("/scan");
  }

  const { data: chantiers, error } = await supabase
    .from("chantiers")
    .select("*")
    .order("date_debut", { ascending: false });

  if (error) {
    console.error("Erreur chantiers:", error);
  }

  const actifs = chantiers?.filter((c: any) => !c.archive) ?? [];
  const archives = chantiers?.filter((c: any) => c.archive) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackButton />
      <h1 className="text-3xl font-bold text-[#1F3A5F] mb-6">Chantiers</h1>

      <h2 className="text-lg font-semibold text-gray-700 mb-3">
        En cours ({actifs.length})
      </h2>
      {!actifs.length ? (
        <p className="text-gray-500 mb-8">Aucun chantier en cours.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {actifs.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-lg text-[#1F3A5F] mb-2">{c.nom}</h3>
              <p className="text-sm text-gray-500 mb-1">
                <span className="font-medium">Client:</span> {c.client || "—"}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                <span className="font-medium">Adresse:</span> {c.adresse || "—"}
              </p>
              <div className="text-xs text-gray-400 border-t pt-3">
                Début: {new Date(c.date_debut).toLocaleDateString("fr-FR")}
                {c.date_fin && (
                  <span className="ml-4">
                    Fin prévue: {new Date(c.date_fin).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {archives.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Terminés ({archives.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {archives.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-bold text-lg text-gray-600 mb-2">{c.nom}</h3>
                <p className="text-sm text-gray-500 mb-1">
                  <span className="font-medium">Client:</span> {c.client || "—"}
                </p>
                <div className="text-xs text-gray-400 border-t pt-3">
                  Terminé le {new Date(c.date_fin).toLocaleDateString("fr-FR")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
