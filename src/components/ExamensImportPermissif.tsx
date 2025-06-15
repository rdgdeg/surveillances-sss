
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { useExamensImportTempMutation } from "@/hooks/useExamensImportTemp";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";

// Importateur permissif : on garde toutes les colonnes de l'Excel, pas de mapping ni validation à ce stade
export function ExamensImportPermissif({ onImportComplete }: { onImportComplete?: (batchId: string) => void }) {
  const { data: activeSession } = useActiveSession();
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const importMutation = useExamensImportTempMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          setPreviewRows(rows.slice(0, 5));
          if (!rows.length) {
            toast({ title: "Fichier vide", description: "Aucune donnée trouvée.", variant: "destructive" });
            return;
          }
          if (!activeSession?.id) {
            toast({ title: "Pas de session active", description: "Sélectionnez une session.", variant: "destructive" });
            return;
          }
          const batchId = uuidv4();
          await importMutation.mutateAsync({
            session_id: activeSession.id,
            imported_by: null,
            batch_id: batchId,
            rows: rows.map((row, idx) => ({
              ordre_import: idx,
              data: row,
            })),
          });
          toast({ title: "Import réussi", description: "L’import a bien été enregistré. Passez à la révision." });
          inputRef.current?.value && (inputRef.current.value = "");
          onImportComplete && onImportComplete(batchId);
        } catch (err) {
          toast({ title: "Erreur d'import", description: err.message || "Erreur lors de l'import du fichier.", variant: "destructive" });
        }
        setImporting(false);
      };
      reader.readAsBinaryString(file);
    } catch (e) {
      setImporting(false);
      toast({ title: "Erreur", description: "Impossible de lire le fichier.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Exams (fichier brut)</CardTitle>
        <CardDescription>
          Sélectionnez un fichier Excel (toutes colonnes gardées pour édition ultérieure).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input type="file" ref={inputRef} accept=".xlsx,.xls" disabled={importing || !activeSession} onChange={handleFileChange} />
        {previewRows.length > 0 && (
          <div className="mt-4 text-xs">
            <b>Aperçu des 5 premières lignes:</b>
            <div className="overflow-x-auto">
              <table className="w-full border mb-2">
                <thead>
                  <tr>
                    {Object.keys(previewRows[0]).map((col) => (
                      <th key={col} className="px-2 py-1 border">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((cell, j) => (
                        <td key={j} className="px-2 py-1 border">{cell?.toString()}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="italic">Tous les champs sont repris tels quels ; passez à la révision pour corriger les informations avant validation.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
