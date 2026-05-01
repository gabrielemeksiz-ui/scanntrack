import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import React from "react";

// Styles façon "bon de commande de magasin"
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#1F3A5F",
  },
  titre: { fontSize: 22, fontWeight: "bold", color: "#1F3A5F" },
  sousTitre: { fontSize: 10, color: "#606060", marginTop: 4 },
  metaBox: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#F5F7FA",
    padding: 12,
    borderRadius: 4,
  },
  metaCol: { flex: 1 },
  metaLabel: {
    fontSize: 8,
    color: "#606060",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 11, fontWeight: "bold" },
  table: { marginTop: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1F3A5F",
    color: "white",
    padding: 8,
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  colRef: { width: "15%" },
  colNom: { width: "40%" },
  colQte: { width: "12%", textAlign: "right" },
  colPU: { width: "15%", textAlign: "right" },
  colTot: { width: "18%", textAlign: "right" },
  totalBox: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#1F3A5F",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 24,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F3A5F",
    minWidth: 100,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
});

interface BonComplet {
  id: string;
  numero: number;
  created_at: string;
  total_ht: number;
  chantier_nom_libre: string | null;
  chantier?: { nom: string; client?: string } | null;
  profile: { prenom: string; nom: string; equipe_num: number };
  lignes: Array<{
    quantite: number;
    prix_unitaire: number;
    total_ligne: number;
    piece: { ref_interne: string; nom: string; unite: string };
  }>;
}

function BonDocument({ bon }: { bon: BonComplet }) {
  const dateFmt = new Date(bon.created_at).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const numFmt = `BS-${new Date(bon.created_at).getFullYear()}-${String(
    bon.numero
  ).padStart(4, "0")}`;

  const chantierLabel = bon.chantier?.nom || bon.chantier_nom_libre || "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.titre}>BON DE SORTIE</Text>
            <Text style={styles.sousTitre}>Stock chantier — {numFmt}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 9, color: "#606060" }}>Émis le</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>{dateFmt}</Text>
          </View>
        </View>

        {/* Meta : chantier + chef équipe */}
        <View style={styles.metaBox}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Chantier</Text>
            <Text style={styles.metaValue}>{chantierLabel}</Text>
            {bon.chantier?.client && (
              <Text style={{ fontSize: 9, color: "#606060", marginTop: 2 }}>
                Client : {bon.chantier.client}
              </Text>
            )}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Chef d&apos;équipe</Text>
            <Text style={styles.metaValue}>
              {bon.profile.prenom} {bon.profile.nom}
            </Text>
            <Text style={{ fontSize: 9, color: "#606060", marginTop: 2 }}>
              Équipe n°{bon.profile.equipe_num}
            </Text>
          </View>
        </View>

        {/* Tableau des pièces */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colRef}>Référence</Text>
            <Text style={styles.colNom}>Désignation</Text>
            <Text style={styles.colQte}>Quantité</Text>
            <Text style={styles.colPU}>P.U. HT</Text>
            <Text style={styles.colTot}>Total HT</Text>
          </View>

          {bon.lignes.map((l, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                i % 2 === 1 ? { backgroundColor: "#FAFAFA" } : {},
              ]}
            >
              <Text style={styles.colRef}>{l.piece.ref_interne}</Text>
              <Text style={styles.colNom}>{l.piece.nom}</Text>
              <Text style={styles.colQte}>
                {l.quantite} {l.piece.unite}
              </Text>
              <Text style={styles.colPU}>
                {l.prix_unitaire.toFixed(2)} €
              </Text>
              <Text style={styles.colTot}>{l.total_ligne.toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL HT</Text>
          <Text style={styles.totalValue}>{bon.total_ht.toFixed(2)} €</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          ScannTrack — Bon généré automatiquement le {dateFmt} • Document non
          falsifiable
        </Text>
      </Page>
    </Document>
  );
}

export async function generateBonPDF(bon: BonComplet): Promise<Buffer> {
  const stream = await pdf(<BonDocument bon={bon} />).toBuffer();
  // toBuffer() de @react-pdf renvoie un NodeJS.ReadableStream
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
