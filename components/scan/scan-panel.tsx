"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Piece, PanierLigne } from "@/types";

/**
 * ScanPanel - Écran principal pour les chefs d'équipe
 *
 * Workflow :
 * 1. Saisie du nom du chantier (champ libre)
 * 2. Activation du scan QR (caméra)
 * 3. Pour chaque scan : lookup pièce + popup quantité + ajout au panier
 * 4. Bouton "Valider" → POST /api/bons/valider → redirige vers récap
 */
export function ScanPanel() {
  const supabase = createClient();
  const [chantierNom, setChantierNom] = useState("");
  const [panier, setPanier] = useState<PanierLigne[]>([]);
  const [scanning, setScanning] = useState(false);
  const [pieceEnCours, setPieceEnCours] = useState<Piece | null>(null);
  const [quantite, setQuantite] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<any>(null);

  // Initialisation du scanner html5-qrcode quand l'utilisateur clique sur "Scanner"
  useEffect(() => {
    if (!scanning) return;

    let mounted = true;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (!mounted) return;
            // On a scanné un code → lookup pièce
            await scanner.stop();
            await handleScanResult(decodedText);
          },
          () => {} // ignore les frames sans code
        );
      } catch (e: any) {
        setError("Impossible d'accéder à la caméra : " + e.message);
        setScanning(false);
      }
    })();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear?.();
          });
      }
    };
  }, [scanning]);

  async function handleScanResult(refInterne: string) {
    setScanning(false);
    setError(null);

    const { data: piece, error } = await supabase
      .from("pieces")
      .select("*")
      .eq("ref_interne", refInterne)
      .eq("actif", true)
      .single();

    if (error || !piece) {
      setError(`Pièce introuvable : ${refInterne}`);
      return;
    }
    setPieceEnCours(piece as Piece);
    setQuantite("1");
  }

  function ajouterAuPanier() {
    if (!pieceEnCours) return;
    const qte = parseFloat(quantite);
    if (isNaN(qte) || qte <= 0) {
      setError("Quantité invalide");
      return;
    }

    setPanier((p) => {
      const existe = p.find((l) => l.piece.id === pieceEnCours.id);
      if (existe) {
        return p.map((l) =>
          l.piece.id === pieceEnCours.id
            ? { ...l, quantite: l.quantite + qte }
            : l
        );
      }
      return [...p, { piece: pieceEnCours, quantite: qte }];
    });
    setPieceEnCours(null);
    setQuantite("1");
  }

  function retirerLigne(pieceId: string) {
    setPanier((p) => p.filter((l) => l.piece.id !== pieceId));
  }

  async function validerBon() {
    if (!chantierNom.trim()) {
      setError("Renseignez le nom du chantier");
      return;
    }
    if (panier.length === 0) {
      setError("Aucune pièce dans le panier");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bons/valider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chantier_nom: chantierNom,
          lignes: panier.map((l) => ({
            piece_id: l.piece.id,
            quantite: l.quantite,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de validation");

      // Reset
      setPanier([]);
      setChantierNom("");
      alert(`Bon ${data.numero} validé. PDF envoyé par mail.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const total = panier.reduce(
    (sum, l) => sum + l.quantite * l.piece.prix_unitaire,
    0
  );

  // ===== Render =====

  // Modale de saisie de quantité
  if (pieceEnCours) {
    return (
      <div className="min-h-screen flex flex-col p-4 bg-slate-50">
        <div className="bg-white rounded-2xl shadow p-6 mt-8">
          <h2 className="text-xl font-bold mb-1">{pieceEnCours.nom}</h2>
          <p className="text-sm text-muted-foreground mb-1">
            Réf : {pieceEnCours.ref_interne}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Stock disponible : {pieceEnCours.stock_actuel} {pieceEnCours.unite}
          </p>

          <label className="block font-medium mb-2">
            Quantité prélevée ({pieceEnCours.unite})
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            className="w-full px-4 py-4 text-2xl font-bold text-center border rounded-lg mb-6"
            autoFocus
          />

          {error && (
            <p className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPieceEnCours(null)}
              className="btn-chantier border-2 border-slate-300 rounded-lg"
            >
              Annuler
            </button>
            <button
              onClick={ajouterAuPanier}
              className="btn-chantier bg-primary text-primary-foreground rounded-lg"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode scan caméra
  if (scanning) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div id="qr-reader" className="w-full" />
        <button
          onClick={() => setScanning(false)}
          className="m-4 btn-chantier bg-white text-black rounded-lg"
        >
          Annuler le scan
        </button>
      </div>
    );
  }

  // Vue principale (panier + boutons)
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-primary">ScannTrack</h1>
        <p className="text-sm text-muted-foreground">
          Scan des sorties de stock
        </p>
      </header>

      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <label className="block text-sm font-medium mb-1">
          Nom du chantier
        </label>
        <input
          type="text"
          value={chantierNom}
          onChange={(e) => setChantierNom(e.target.value)}
          placeholder="Ex : Villa Dupont, Bât. C"
          className="w-full px-4 py-3 text-base border rounded-lg"
        />
      </div>

      <button
        onClick={() => setScanning(true)}
        className="w-full btn-chantier bg-primary text-primary-foreground rounded-lg mb-6 text-xl"
      >
        📷 Scanner une pièce
      </button>

      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <h2 className="font-bold mb-3">
          Panier ({panier.length} pièce{panier.length > 1 ? "s" : ""})
        </h2>

        {panier.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Le panier est vide. Scannez votre première pièce.
          </p>
        ) : (
          <ul className="divide-y">
            {panier.map((l) => (
              <li
                key={l.piece.id}
                className="py-3 flex justify-between items-center"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{l.piece.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.quantite} {l.piece.unite} ×{" "}
                    {l.piece.prix_unitaire.toFixed(2)} €
                  </p>
                </div>
                <button
                  onClick={() => retirerLigne(l.piece.id)}
                  className="text-red-500 px-3 py-2 text-sm"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}

        {panier.length > 0 && (
          <div className="mt-3 pt-3 border-t flex justify-between font-bold">
            <span>Total HT</span>
            <span>{total.toFixed(2)} €</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={validerBon}
        disabled={submitting || panier.length === 0}
        className="w-full btn-chantier bg-green-600 text-white rounded-lg disabled:opacity-50 text-xl"
      >
        {submitting ? "Validation..." : "✓ Valider le bon de sortie"}
      </button>
    </div>
  );
}
