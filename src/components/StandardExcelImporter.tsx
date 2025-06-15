import { useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";

// Nouvelle fonction de normalisation plus robuste
function normalizeCol(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retirer accents
    .replace(/[()]/g, "") // enlever parenthèses
    .replace(/[^a-zA-Z0-9/]/g, "") // retire tout sauf lettres/chiffres/slash
    .replace(/\s+/g, "") // retire espaces partout
    .toLowerCase();
}

// Mapping étendu et tolérant
const COLUMN_MAP = {
  jour: ["jour", "date", "dateexamen"],
  debut: ["debut", "heuredebut", "debutheure", "heuredebutexamen", "début"],
  fin: ["fin", "heurefin", "finheure", "heurefinexamen"],
  duree: [
    "dureeh", 
    "duree", 
    "dureeexamen", 
    "durée", 
    "dureeh", 
    "duree(h)",
    "duréeh"
  ],
  activite: ["activite", "matiere", "nomexamen", "activité"],
  faculte: [
    "facultesecreteriat", "faculte", "secreteriat", 
    "facultésecreteriat", "faculté", 
    "facultésecrétariat", "faculté/secrétariat","faculte/secreteriat",
    "facultesecretariat", "faculte/secrétariat", "faculté/secréteriat",
    "faculte/secrétariat", "faculté/secrétariat",
    "faculte/secreteriat", "faculté/secrétariat",
    "faculté/secréteriat", "faculté/secrétariat",
    "faculté/secrétariat", "faculté / secreteriat", "faculté / secrétariat"
  ],
  code: ["code", "codeexamen"],
  auditoires: ["auditoires", "auditoire", "salle"],
  etudiants: ["etudiants", "etudiant", "effectif", "nombreetudiants"],
  enseignants: ["enseignants", "enseignant"]
};

function findColKey(keys: string[], wanted: string[]): string | null {
  for (const k of keys) {
    const norm = normalizeCol(k);
    if (wanted.includes(norm)) return k;
  }
  return null;
}

// Liste des noms recommandés et leurs colonnes
const RECOMMENDED_COLUMNS = [
  { ideal: "Jour", matchers: ["jour", "date", "dateexamen"] },
  { ideal: "Debut", matchers: ["debut", "heuredebut", "debutheure", "heuredebutexamen", "début"] },
  { ideal: "Fin", matchers: ["fin", "heurefin", "finheure", "heurefinexamen"] },
  { ideal: "Duree", matchers: ["dureeh","duree","dureeexamen","durée","duree(h)","duréeh"] },
  { ideal: "Activite", matchers: ["activite","matiere","nomexamen","activité"] },
  { ideal: "Faculte", matchers: ["faculte","faculté","secreteriat","secrétariat"] },
  { ideal: "Code", matchers: ["code","codeexamen"] },
  { ideal: "Auditoires", matchers: ["auditoires","auditoire","salle"] },
  { ideal: "Etudiants", matchers: ["etudiants","etudiant","effectif","nombreetudiants"] },
  { ideal: "Enseignants", matchers: ["enseignants","enseignant"] },
];

// Regex: accent/caractère spécial/espaces hors lettres ou chiffres
function isNonIdealHeader(header: string): boolean {
  // Accepts e.g. "Durée", "Début", "Faculté / Secrétariat", "Code examen"
  // Refuse si contient autre chose que a-zA-Z0-9 (slash ou espace toléré si besoin)
  return /[àâäéèêëîïôöùûüçœÿÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒŸ]/.test(header) ||
    /[^\w\d]/.test(header) ||
    /\s/.test(header);
}

// Trouver les corrections recommandées
function getSuggestions(headers: string[]) {
  return headers
    .filter(h => isNonIdealHeader(h))
    .map(h => {
      // Proposition : suggère le "ideal" le plus proche selon normalisation
      const norm = normalizeCol(h);
      const nearest = RECOMMENDED_COLUMNS.find(col =>
        col.matchers.some(m => m === norm || normalizeCol(m) === norm)
      );
      return { name: h, suggestion: nearest ? nearest.ideal : null };
    });
}

// Ajout : ligne problématique "salle vide"
const [invalidSalleRows, setInvalidSalleRows] = useState<number[]>([]);
// Ajout : ligne faculté vide
const [emptyFaculteRows, setEmptyFaculteRows] = useState<number[]>([]);

export const StandardExcelImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const { data: activeSession } = useActiveSession();
  const { data: contraintesAuditoires, isLoading: loadingContraintes } = useContraintesAuditoires();

  // Les clés réelles trouvées
  const [detectedColumns, setDetectedColumns] = useState<any | null>(null);
  const [headerSuggestions, setHeaderSuggestions] = useState<{name: string, suggestion: string|null}[]>([]);

  // Fonction utilitaire pour convertir une date Excel/chaîne en YYYY-MM-DD
  function formatDateCell(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'number') {
      // Excel number
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
      if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
        const [d, m, y] = value.split('/');
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  }

  // Fonction utilitaire pour convertir heure Excel/chaîne en HH:MM
  function formatTimeCell(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'number') {
      const totalMinutes = Math.round(value * 24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    if (typeof value === 'string') {
      const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
      if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    }
    return null;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setFile(selected || null);
    if (selected) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

          // Ajout : suggestions naming
          const suggestions = getSuggestions(cols);
          setHeaderSuggestions(suggestions);

          // Mapping amélioré !
          const colMap: Record<string, string | null> = {};
          Object.entries(COLUMN_MAP).forEach(([field, variations]) => {
            const wanted = variations.map(normalizeCol);
            const found = findColKey(cols, wanted);
            colMap[field] = found;
          });

          // Pour debuggage : log dans la console le mapping trouvé
          console.log("Mapping des colonnes détectées:", colMap);
          setDetectedColumns(colMap);

          // Ajout d'un warning toast si colonnes critiques manquantes
          const missing = ["jour", "debut", "fin"].filter(field => !colMap[field]);
          if (missing.length > 0) {
            toast({
              title: "Colonnes obligatoires manquantes",
              description: `Les colonnes suivantes sont manquantes ou mal orthographiées : ${missing.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}.\nColonnes Excel trouvées : ${cols.join(', ')}`,
              variant: "destructive"
            });
            setParsedRows([]);
            setPreviewRows([]);
            return;
          }

          // File preview/check, with empty salle/faculte confirm
          const colSalle = colMap.auditoires;
          const colFaculte = colMap.faculte;

          const rowsWithEmptySalle: number[] = [];
          const rowsWithEmptyFaculte: number[] = [];

          // Nettoyage + détection : "vide" si chaîne vide ou espaces
          rows.forEach((row, i) => {
            // Normalise null/undefined à chaîne vide pour salle/faculté
            if (colSalle && (row[colSalle] === undefined || row[colSalle] === null)) row[colSalle] = "";
            if (colFaculte && (row[colFaculte] === undefined || row[colFaculte] === null)) row[colFaculte] = "";

            // Test si auditoire vide
            if (!colSalle || !row[colSalle] || (typeof row[colSalle] === "string" && row[colSalle].trim() === "")) {
              rowsWithEmptySalle.push(i);
            }
            // Test faculté vide                
            if (!colFaculte || !row[colFaculte] || (typeof row[colFaculte] === "string" && row[colFaculte].trim() === "")) {
              rowsWithEmptyFaculte.push(i);
            }
          });
          setInvalidSalleRows(rowsWithEmptySalle);
          setEmptyFaculteRows(rowsWithEmptyFaculte);

          if (rowsWithEmptySalle.length > 0) {
            toast({
              title: "Erreur : Auditoire(s) manquant(s)",
              description: `Les lignes suivantes n'ont pas d'auditoire : ${rowsWithEmptySalle.map(idx => idx+2).join(', ')}. Corrigez-les avant d'importer (la colonne auditoire est obligatoire).`,
              variant: "destructive"
            });
            setParsedRows(rows);
            setPreviewRows(rows.slice(0, 5));
            return;
          }

          setParsedRows(rows);
          setPreviewRows(rows.slice(0, 5));
        } catch (e) {
          toast({
            title: "Erreur de lecture",
            description: "Le fichier Excel n'a pas pu être lu.",
            variant: "destructive"
          });
          setParsedRows([]);
          setPreviewRows([]);
          setHeaderSuggestions([]);
        }
      };
      reader.readAsBinaryString(selected);
    } else {
      setPreviewRows([]);
      setParsedRows([]);
      setHeaderSuggestions([]);
      setInvalidSalleRows([]);
      setEmptyFaculteRows([]);
    }
  };

  const handleImport = async () => {
    if (!file || importing || !activeSession?.id) return;
    setImporting(true);
    try {
      if (!detectedColumns) {
        toast({
          title: "Aucun fichier chargé ou mapping colonnes invalide.",
          description: "Veuillez sélectionner un fichier Excel valide.",
          variant: "destructive"
        });
        setImporting(false);
        return;
      }
      // On bloque si au moins une ligne a un auditoire vide
      if (invalidSalleRows.length > 0) {
        toast({
          title: "Import impossible",
          description:
            "Certains examens n'ont pas d'auditoire spécifié. Veuillez corriger avant d'importer.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }
      let totalOk = 0, totalFail = 0;
      for (let idx = 0; idx < parsedRows.length; idx++) {
        const row = parsedRows[idx];

        // Utilise mapping des colonnes
        const col = (key: string) => detectedColumns[key] ? row[detectedColumns[key]] : null;

        // Vérification et parsing de la colonne "Début"
        const parsedHeureDebut = formatTimeCell(col("debut"));
        if (!parsedHeureDebut) {
          totalFail++;
          toast({
            title: `Heure de début manquante ou invalide`,
            description: `Ligne ${idx + 2} : l'examen "${col("activite") || col("code") || "-"}" n'a pas d'heure de début correcte dans le fichier Excel (valeur originale "${col("debut")}").`,
            variant: "destructive",
          });
          continue;
        }

        const parsedHeureFin = formatTimeCell(col("fin"));
        if (!parsedHeureFin) {
          totalFail++;
          toast({
            title: `Heure de fin manquante ou invalide`,
            description: `Ligne ${idx + 2} : l'examen "${col("activite") || col("code") || "-"}" n'a pas d'heure de fin correcte dans le fichier Excel (valeur originale "${col("fin")}").`,
            variant: "destructive",
          });
          continue;
        }

        let rawDuree = col("duree");
        let duree: number | null = null;
        if (rawDuree !== undefined && rawDuree !== "") {
          if (typeof rawDuree === "number") {
            duree = rawDuree;
          } else if (typeof rawDuree === "string") {
            const parsed = parseFloat(rawDuree.replace(",", "."));
            duree = isNaN(parsed) ? null : parsed;
          }
        }
        const examenData: any = {
          session_id: activeSession.id,
          date_examen: formatDateCell(col("jour")),
          duree,
          heure_debut: parsedHeureDebut,
          heure_fin: parsedHeureFin,
          faculte: col("faculte") || null,
          code_examen: col("code") || null,
          salle: col("auditoires") || null,
          etudiants: col("etudiants") || null,
          enseignants: col("enseignants") || null,
          statut_validation: "NON_TRAITE",
          is_active: true,
          matiere: col("activite") || null,
          type_requis: "Assistant",
        };

        Object.keys(examenData).forEach(key => {
          if (examenData[key] === undefined) examenData[key] = null;
        });

        const { error } = await supabase.from("examens").insert(examenData);

        if (!error) {
          totalOk++;
        } else {
          totalFail++;
          console.error(`Erreur à la ligne ${idx + 2} (code: ${examenData.code_examen}):`, error);
          toast({
            title: `Échec pour "${examenData.code_examen || '-'}"`,
            description: `Ligne ${idx + 2} du fichier (${error.message})`,
            variant: "destructive",
          });
        }
      }
      toast({
        title: "Import terminé",
        description: `Examens importés : ${totalOk}, échecs : ${totalFail}`,
      });
      setFile(null);
      setPreviewRows([]);
      setParsedRows([]);
    } catch (e: any) {
      toast({
        title: "Erreur d'import",
        description: e.message || "Impossible d'importer le fichier.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  // Calcul du nombre de surveillants théorique si possible
  function getTheoriqueCount(auditoire: string) {
    if (!auditoire || !contraintesAuditoires) return null;
    const key = auditoire.trim().toLowerCase();
    return contraintesAuditoires[key] || null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Excel Examens</CardTitle>
        <CardDescription>
          Importez un fichier Excel pour ajouter/modifier les examens de la session en cours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeSession && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Session requise</AlertTitle>
            <AlertDescription>Veuillez d'abord sélectionner une session active.</AlertDescription>
          </Alert>
        )}

        <Input
          type="file"
          accept=".xlsx,.xls"
          disabled={importing || !activeSession}
          onChange={handleFileChange}
          className="mb-2"
        />

        {/* Zone d'avertissement si colonnes à améliorer */}
        {headerSuggestions.length > 0 && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-400 text-yellow-800">
            <div className="flex items-start gap-2">
              <span className="mt-1 mr-2">
                <svg width="20" height="20" fill="orange" viewBox="0 0 24 24"><g><circle cx="12" cy="12" r="10" fill="#f59e42"/><text x="12" y="16" fontSize="13" textAnchor="middle" fill="#fff" fontWeight="bold">!</text></g></svg>
              </span>
              <div>
                <AlertTitle>Astuce pour vos fichiers Excel</AlertTitle>
                <AlertDescription>
                  Noms de colonnes ci-dessous à simplifier pour les prochains imports.<br />
                  Utilisez des intitulés sans accent, sans espace ni caractères spéciaux :
                  <ul className="list-disc ml-6 mt-1 space-y-0">
                    {headerSuggestions.map(s =>
                      <li key={s.name}>
                        <span className="font-semibold">{s.name}</span>
                        {s.suggestion && (
                          <> → <span className="text-green-900 font-medium">{s.suggestion}</span></>
                        )}
                      </li>
                    )}
                  </ul>
                  <div className="mt-2">
                    <b>Exemple recommandé de colonnes :</b><br />
                    <code className="bg-white py-0.5 px-1 rounded border text-xs">
                      Jour, Debut, Fin, Duree, Activite, Faculte, Code, Auditoires, Etudiants, Enseignants
                    </code>
                  </div>
                  <div className="mt-2 text-xs">
                    <b>Format des heures (conseillé)&nbsp;:</b> <span className="font-mono">08:30</span> (HH:MM, sur 24h)<br />
                    <b>Format des dates (conseillé)&nbsp;:</b> <span className="font-mono">2025-06-20</span> (YYYY-MM-DD)
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Affichage des alertes avant prévisualisation */}
        {(invalidSalleRows.length > 0 || emptyFaculteRows.length > 0) && (
          <Alert
            variant={invalidSalleRows.length > 0 ? "destructive" : "default"}
            className={invalidSalleRows.length > 0 ? "" : "bg-yellow-50 border-yellow-400 text-yellow-800"}
          >
            <AlertTitle>
              {invalidSalleRows.length > 0 ? "Erreur d'import" : "Champs à corriger"}
            </AlertTitle>
            <AlertDescription>
              {invalidSalleRows.length > 0 && (
                <>
                  Les lignes suivantes n'ont <b>pas d'auditoire spécifié</b> (champ obligatoire) :{" "}
                  <span className="font-mono">{invalidSalleRows.map(idx => idx + 2).join(", ")}</span>
                  <br /><b>L'import est bloqué</b> tant que ces lignes ne sont pas corrigées.
                </>
              )}
              {invalidSalleRows.length > 0 && emptyFaculteRows.length > 0 && <hr className="my-2" />}
              {emptyFaculteRows.length > 0 && (
                <>
                  Les lignes suivantes n'ont <span className="font-semibold text-orange-700">pas de faculté</span> (conseillé de compléter) :{" "}
                  <span className="font-mono">{emptyFaculteRows.map(idx => idx + 2).join(", ")}</span>
                  <br />
                  <span className="text-xs italic text-orange-800">L'import est toléré, mais corrigez si possible pour la qualité du suivi.</span>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Aperçu augmenté pour affichage des erreurs et surveillants théoriques */}
        {previewRows.length > 0 && (
          <div className="border rounded-md p-3 bg-blue-50 space-y-2">
            <h4 className="font-medium text-blue-900">Aperçu du fichier (5 premières lignes):</h4>
            <div className="text-xs text-blue-900 mb-1">
              <b>Correspondances colonnes importantes :</b>
              <ul>
                {Object.entries(COLUMN_MAP).map(([champ, variations]) => (
                  <li key={champ}>
                    <span className="font-semibold capitalize">{champ} :</span>{" "}
                    <span className={detectedColumns?.[champ] ? "text-green-700" : "text-red-500"}>
                      {detectedColumns?.[champ] || <span className="italic">Non détecté</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-blue-200">
                <thead>
                  <tr>
                    {Object.keys(previewRows[0] ?? {}).map(col =>
                      <th className="px-2 py-1 font-semibold" key={col}>{col}</th>
                    )}
                    <th className="px-2 py-1 font-semibold text-uclouvain-blue">Surveillants théoriques</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => {
                    // Index de ligne Excel = i+2 (header + base-0)
                    const isSalleMissing = invalidSalleRows.includes(i);
                    const isFaculteMissing = emptyFaculteRows.includes(i);
                    const salleVal = detectedColumns?.auditoires ? row[detectedColumns.auditoires] : null;
                    const faculteVal = detectedColumns?.faculte ? row[detectedColumns.faculte] : null;
                    const theorique =
                      salleVal && contraintesAuditoires
                        ? getTheoriqueCount(salleVal)
                        : null;

                    return (
                      <tr key={i} className={isSalleMissing ? "bg-red-100" : ""}>
                        {Object.keys(row).map(col => {
                          // Surligne l'auditoire idéalement en rouge si vide, orange pour faculté
                          if (detectedColumns?.auditoires && col === detectedColumns.auditoires)
                            return (
                              <td key={col}
                                className={isSalleMissing ? "bg-red-200 border-2 border-red-400 font-semibold text-red-800" : ""}>
                                {row[col]?.toString() || <span className="italic text-red-600">vide</span>}
                              </td>
                            );
                          if (detectedColumns?.faculte && col === detectedColumns.faculte)
                            return (
                              <td key={col}
                                className={isFaculteMissing ? "bg-yellow-200 border-2 border-yellow-400 font-medium text-yellow-900" : ""}>
                                {row[col]?.toString() || <span className="italic text-yellow-800">vide</span>}
                              </td>
                            );
                          return (<td key={col}>{row[col]?.toString()}</td>);
                        })}
                        <td className={theorique === null ? "text-red-700" : "text-green-800 font-bold"}>
                          {salleVal && theorique !== null
                            ? theorique
                            : salleVal
                              ? <span className="italic text-red-600">?</span>
                              : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Vérifiez les colonnes et leur contenu avant de poursuivre.<br />
              {invalidSalleRows.length > 0 && <span className="text-red-700">L'import est bloqué tant qu'un auditoire est vide.</span>}
              {emptyFaculteRows.length > 0 && <span className="text-orange-700">Champs "faculté" recommandé à compléter.</span>}
            </div>
          </div>
        )}

        <Button 
          className="w-full mt-2"
          disabled={!file || importing || !activeSession || invalidSalleRows.length > 0}
          onClick={handleImport}
        >
          {importing ? "Importation..." : "Confirmer l'import"}
        </Button>
      </CardContent>
    </Card>
  );
};
