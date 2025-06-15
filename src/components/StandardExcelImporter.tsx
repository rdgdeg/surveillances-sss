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

export const StandardExcelImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const { data: activeSession } = useActiveSession();

  // Fonction utilitaire pour convertir une date Excel/chaîne en YYYY-MM-DD
  function formatDateCell(value: any): string | null {
    if (!value) return null;
    // Format Excel date (numérique)
    if (typeof value === 'number') {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
    // Format string déjà en ISO ou FR : 2024-06-12 ou 12/06/2024
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
      if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
        const [d, m, y] = value.split('/');
        return `${y}-${m}-${d}`;
      }
      // Sinon, renvoie null si aucun pattern reconnu
    }
    return null;
  }

  // Fonction utilitaire pour convertir heure Excel/chaîne en HH:MM
  function formatTimeCell(value: any): string | null {
    if (!value) return null;
    // Cas nombre Excel = fraction de jour (ex: 0.75 = 18:00)
    if (typeof value === 'number') {
      const totalMinutes = Math.round(value * 24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    // Cas string
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
      // Parse & preview
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          setParsedRows(rows);
          setPreviewRows(rows.slice(0, 5)); // Preview only first 5
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
      let totalOk = 0, totalFail = 0;
      for (let idx = 0; idx < parsedRows.length; idx++) {
        const row = parsedRows[idx];
        const examenData: any = {
          session_id: activeSession.id,
          date_examen: formatDateCell(row["Jour"]),
          duree: 
            row["Durée (h)"] !== undefined && row["Durée (h)"] !== ""
              ? typeof row["Durée (h)"] === 'number'
                ? row["Durée (h)"]
                : typeof row["Durée (h)"] === 'string'
                  ? parseFloat(row["Durée (h)"].replace(",", "."))
                  : null
              : null,
          heure_debut: formatTimeCell(row["Début"]),
          heure_fin: formatTimeCell(row["Fin"]),
          activite: row["Activité"] || null,
          faculte: row["Faculté / Secrétariat"] || null,
          code_examen: row["Code"] || null,
          salle: row["Auditoires"] || null,
          etudiants: row["Etudiants"] || null,
          enseignants: row["Enseignants"] || null,
          statut_validation: "NON_TRAITE",
          is_active: true,
          matiere: row["Activité"] || null,
          type_requis: "Assistant",
        };
        // Supprimer 'undefined' (évite soucis sur columns non nullables)
        Object.keys(examenData).forEach(key => {
          if (examenData[key] === undefined) examenData[key] = null;
        });

        const { error } = await supabase.from("examens").insert(examenData);

        if (!error) {
          totalOk++;
        } else {
          totalFail++;
          // Logguez l'erreur et affichez un toast pour savoir quel examen a échoué
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
