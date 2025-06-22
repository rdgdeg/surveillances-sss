
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { FileSpreadsheet, Upload, AlertCircle, Eye, Check } from "lucide-react";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SurveillantImport {
  nom: string;
  prenom: string;
  email: string;
  type: string;
  faculte_interdite?: string | null;
  eft?: number | null;
  affectation_fac?: string | null;
  date_fin_contrat?: string | null;
  telephone_gsm?: string | null;
  campus?: string | null;
  statut?: string;
}

export const NewFileUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<SurveillantImport[]>([]);
  const [allData, setAllData] = useState<SurveillantImport[]>([]);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [validated, setValidated] = useState(false);
  const { data: activeSession } = useActiveSession();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidated(false);
      setShowFullPreview(false);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map Excel columns to our data structure
        const mappedData = jsonData.map((row: any) => ({
          nom: row.nom || row.Nom || row.NOM || '',
          prenom: row.prenom || row.Prénom || row.PRENOM || '',
          email: row.email || row.Email || row.EMAIL || '',
          type: row.type || row.Type || row.TYPE || 'Autre',
          faculte_interdite: row.faculte_interdite || row['Faculté interdite'] || null,
          eft: row.eft || row.EFT || row.ETP || null,
          affectation_fac: row.affectation_fac || row.Affectation || null,
          date_fin_contrat: row.date_fin_contrat || row['Date fin contrat'] || null,
          telephone_gsm: row.telephone_gsm || row.GSM || row.Téléphone || null,
          campus: row.campus || row.Campus || null,
          statut: 'actif'
        }));

        // Validate required fields
        const validData = mappedData.filter(item => 
          item.nom && item.prenom && item.email && item.email.includes('@')
        );

        if (validData.length === 0) {
          toast({
            title: "Format invalide",
            description: "Aucune donnée valide trouvée. Vérifiez les colonnes nom, prenom, email.",
            variant: "destructive"
          });
          return;
        }

        setAllData(validData);
        setPreviewData(validData.slice(0, 5)); // Preview first 5 rows
        
        toast({
          title: "Fichier analysé",
          description: `${validData.length} surveillants trouvés. Vérifiez l'aperçu avant d'importer.`,
        });
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({
          title: "Erreur de lecture",
          description: "Impossible de lire le fichier Excel.",
          variant: "destructive"
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateData = () => {
    setValidated(true);
    toast({
      title: "Données validées",
      description: "Vous pouvez maintenant procéder à l'import.",
    });
  };

  const handleFileImport = async () => {
    if (!activeSession?.id || !validated) {
      toast({
        title: "Validation requise",
        description: "Veuillez d'abord valider les données avant l'import.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      let importedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Import all validated data
      for (const surveillant of allData) {
        const { email, ...rest } = surveillant;
        
        // Check if surveillant exists
        const { data: existing, error: searchErr } = await supabase
          .from('surveillants')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (searchErr) {
          errorCount++;
          continue;
        }

        if (existing) {
          // Update existing surveillant
          const { error: updateErr } = await supabase
            .from('surveillants')
            .update({ ...rest })
            .eq('id', existing.id);
          
          if (updateErr) {
            errorCount++;
          } else {
            updatedCount++;
            
            // Check if surveillant_session exists
            const { data: sessionExists } = await supabase
              .from('surveillant_sessions')
              .select('id')
              .eq('surveillant_id', existing.id)
              .eq('session_id', activeSession.id)
              .maybeSingle();
            
            if (!sessionExists) {
              // Create session link if not exists
              await supabase
                .from('surveillant_sessions')
                .insert({
                  surveillant_id: existing.id,
                  session_id: activeSession.id,
                  quota: rest.type === 'PAT' ? 12 : 6,
                  is_active: true
                });
            }
          }
        } else {
          // Create new surveillant
          const { data: newSurveillant, error: insertErr } = await supabase
            .from('surveillants')
            .insert({ email, ...rest })
            .select('id')
            .single();
          
          if (insertErr || !newSurveillant) {
            errorCount++;
          } else {
            importedCount++;
            
            // Create session link
            await supabase
              .from('surveillant_sessions')
              .insert({
                surveillant_id: newSurveillant.id,
                session_id: activeSession.id,
                quota: rest.type === 'PAT' ? 12 : 6,
                is_active: true
              });
          }
        }
      }

      toast({
        title: "Import terminé",
        description: `${importedCount} surveillants importés, ${updatedCount} mis à jour, ${errorCount} erreurs.`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      // Reset form
      setFile(null);
      setPreviewData([]);
      setAllData([]);
      setValidated(false);
      setShowFullPreview(false);
      
    } catch (error: any) {
      toast({
        title: "Erreur d'import",
        description: error.message || "Une erreur est survenue lors de l'import.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const dataToShow = showFullPreview ? allData : previewData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import de Surveillants</span>
        </CardTitle>
        <CardDescription>
          Importez des surveillants depuis un fichier Excel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activeSession && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Session requise</AlertTitle>
            <AlertDescription>
              Veuillez d'abord sélectionner une session active.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">Fichier Excel</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading || !activeSession}
            />
          </div>

          {allData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Aperçu des données ({allData.length} surveillants trouvés)
                </h3>
                <div className="flex items-center space-x-2">
                  {allData.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullPreview(!showFullPreview)}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{showFullPreview ? "Aperçu réduit" : "Tout voir"}</span>
                    </Button>
                  )}
                  <Button
                    variant={validated ? "default" : "outline"}
                    size="sm"
                    onClick={validateData}
                    disabled={validated}
                    className="flex items-center space-x-1"
                  >
                    <Check className="h-3 w-3" />
                    <span>{validated ? "Validé" : "Valider"}</span>
                  </Button>
                </div>
              </div>

              <div className="border rounded-md p-2 overflow-x-auto max-h-96">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left">Nom</th>
                      <th className="px-2 py-1 text-left">Prénom</th>
                      <th className="px-2 py-1 text-left">Email</th>
                      <th className="px-2 py-1 text-left">Type</th>
                      <th className="px-2 py-1 text-left">Campus</th>
                      <th className="px-2 py-1 text-left">EFT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataToShow.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-2 py-1">{item.nom}</td>
                        <td className="px-2 py-1">{item.prenom}</td>
                        <td className="px-2 py-1">{item.email}</td>
                        <td className="px-2 py-1">{item.type}</td>
                        <td className="px-2 py-1">{item.campus || '-'}</td>
                        <td className="px-2 py-1">{item.eft || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!showFullPreview && allData.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Affichage des 5 premières lignes sur {allData.length}.
                  </p>
                )}
              </div>

              {validated && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Données validées</AlertTitle>
                  <AlertDescription>
                    Les données ont été vérifiées et sont prêtes pour l'import.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Button
            onClick={handleFileImport}
            disabled={!file || uploading || !activeSession || !validated}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{uploading ? "Importation..." : "Confirmer l'import"}</span>
          </Button>

          <div className="text-sm text-muted-foreground mt-4">
            <p className="font-medium">Format attendu:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Colonnes obligatoires: nom, prenom, email</li>
              <li>Colonnes optionnelles: type, faculte_interdite, eft, affectation_fac, date_fin_contrat, telephone_gsm, campus</li>
              <li>Les surveillants existants seront mis à jour selon leur email</li>
              <li><strong>Important:</strong> Validez les données avant de procéder à l'import</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
