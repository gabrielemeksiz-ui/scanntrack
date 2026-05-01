import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6">Chantiers</h1>

      {!chantiers || chantiers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-muted-foreground">
          Aucun chantier enregistré.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chantiers.map((c: any) => (
            <div
              key={c.id}
              className={`bg-white rounded-2xl shadow p-5 ${c.archive ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{c.nom}</h3>
                {c.archive && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    Archivé
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-medium">Client:</span> {c.client || "—"}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium">Adresse:</span> {c.adresse || "—"}
              </p>
              <div className="text-xs text-muted-foreground border-t pt-3 mt-3">
                <span>Début: {new Date(c.date_debut).toLocaleDateString("fr-FR")}</span>
                {c.date_fin && (
                  <span className="ml-4">
                    Fin: {new Date(c.date_fin).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
