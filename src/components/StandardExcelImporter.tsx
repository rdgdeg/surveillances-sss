
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

// Utilitaire pour normaliser les noms de colonnes (retire accents, casse, espaces)
function normalizeCol(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retirer accents
    .replace(/\s+/g, "")
    .toLowerCase();
}

// Map de toutes les variations connues pour chaque champ
const COLUMN_MAP = {
  jour: ["jour", "date", "dateexamen"],
  debut: ["debut", "heuredebut", "debutheure", "heuredebutexamen"],
  fin: ["fin", "heurefin", "finheure", "heurefinexamen"],
  duree: ["duree(h)", "duree", "dureeexamen"],
  activite: ["activite", "matiere", "nomexamen"],
  faculte: ["faculte/secreteriat", "faculte", "secreteriat", "faculte/secrétariat", "faculte / secreteriat", "faculte / secrétariat", "faculté/secrétariat", "faculté/secreteriat", "faculté / secrétariat", "faculté / secreteriat"],
  code: ["code", "codeexamen"],
  auditoires: ["auditoires", "auditoire", "salle"],
  etudiants: ["etudiants", "etudiant", "effectif", "nombreetudiants"],
  enseignants: ["enseignants", "enseignant"]
};

// Trouve le nom réel de colonne dans l'Excel qui correspond à un des champs clés
function findColKey(keys: string[], wanted: string[]): string | null {
  for (const k of keys) {
    const norm = normalizeCol(k);
    if (wanted.includes(norm)) return k;
  }
  return null;
}

export const StandardExcelImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const { data: activeSession } = useActiveSession();

  // Les clés réelles trouvées
  const [detectedColumns, setDetectedColumns] = useState<any | null>(null);

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
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          // Détermination dynamique des colonnes
          const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
          // Pour chaque champ attendu, on cherche la colonne correspondante (plus tolérant)
          const colMap: Record<string, string | null> = {};
          Object.entries(COLUMN_MAP).forEach(([field, variations]) => {
            // Ajoute la version normalisée pour matcher plus large
            const wanted = variations.map(normalizeCol);
            const found = findColKey(cols, wanted);
            colMap[field] = found;
          });
          setDetectedColumns(colMap);

          // Teste si colonnes essentielles sont bien détectées
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
        }
      };
      reader.readAsBinaryString(selected);
    } else {
      setPreviewRows([]);
      setParsedRows([]);
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

        {previewRows.length > 0 && (
          <div className="border rounded-md p-3 bg-blue-50 space-y-2">
            <h4 className="font-medium text-blue-900">Aperçu du fichier (5 premières lignes):</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-blue-200">
                <thead>
                  <tr>
                    {Object.keys(previewRows[0] ?? {}).map(col =>
                      <th className="px-2 py-1 font-semibold" key={col}>{col}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b">
                      {Object.values(row).map((cell, j) => (
                        <td className="px-2 py-1" key={j}>
                          {typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean"
                            ? cell.toString()
                            : cell === null || cell === undefined
                              ? ""
                              : JSON.stringify(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-blue-600 mt-1">
                Vérifiez les colonnes et leur contenu avant de poursuivre.
              </div>
            </div>
          </div>
        )}

        <Button 
          className="w-full mt-2"
          disabled={!file || importing || !activeSession}
          onClick={handleImport}
        >
          {importing ? "Importation..." : "Confirmer l'import"}
        </Button>
      </CardContent>
    </Card>
  );
};
