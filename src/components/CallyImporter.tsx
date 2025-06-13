
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { parseFlexibleDate } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';

interface CallyData {
  surveillant: string;
  email: string;
  type: string;
  disponibilites: Record<string, boolean>;
}

interface AuditoireValidationResult {
  validationPassed: boolean;
  auditoiresNonReconnus: string[];
  totalCreneaux: number;
  creneauxValides: number;
}

export const CallyImporter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<CallyData[]>([]);
  const [validationResult, setValidationResult] = useState<AuditoireValidationResult | null>(null);
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();

  // Récupérer les contraintes d'auditoires pour validation
  const { data: contraintesAuditoires } = useQuery({
    queryKey: ['contraintes-auditoires-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire');

      if (error) throw error;
      return new Set(data.map(c => c.auditoire.toLowerCase()));
    }
  });

  const parseCallyFile = (file: File): Promise<CallyData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
          }

          // Première ligne = en-têtes
          const headers = jsonData[0] as string[];
          const surveillantIndex = headers.findIndex(h => h.toLowerCase().includes('surveillant'));
          const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
          const typeIndex = headers.findIndex(h => h.toLowerCase().includes('type'));

          if (surveillantIndex === -1 || emailIndex === -1 || typeIndex === -1) {
            throw new Error('Le fichier doit contenir les colonnes: Surveillant, Email, Type');
          }

          // Créneaux horaires (colonnes après les 3 premières)
          const timeSlotHeaders = headers.slice(3);

          const parsedData: CallyData[] = [];

          // Parser chaque ligne de surveillant
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const surveillant = row[surveillantIndex]?.toString().trim();
            const email = row[emailIndex]?.toString().trim();
            const type = row[typeIndex]?.toString().trim();

            if (!surveillant || !email || !type) continue;

            const disponibilites: Record<string, boolean> = {};

            // Parser les disponibilités avec validation des dates
            timeSlotHeaders.forEach((timeSlot, index) => {
              const cellValue = row[3 + index]?.toString().trim();
              // Interpréter ✓, V, 1, true comme disponible
              const isAvailable = /^(✓|v|1|true|oui|yes)$/i.test(cellValue || '');
              
              // Valider le format de date dans le créneau
              const dateValidation = parseFlexibleDate(timeSlot.split(' ')[0]);
              if (dateValidation) {
                disponibilites[timeSlot] = isAvailable;
              }
            });

            parsedData.push({
              surveillant,
              email: email.toLowerCase(),
              type,
              disponibilites
            });
          }

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsBinaryString(file);
    });
  };

  const validateAuditoires = (data: CallyData[]): AuditoireValidationResult => {
    if (!contraintesAuditoires) {
      return {
        validationPassed: false,
        auditoiresNonReconnus: [],
        totalCreneaux: 0,
        creneauxValides: 0
      };
    }

    const auditoiresDetectes = new Set<string>();
    let totalCreneaux = 0;
    let creneauxValides = 0;

    data.forEach(callyData => {
      Object.keys(callyData.disponibilites).forEach(timeSlot => {
        totalCreneaux++;
        
        // Extraire l'auditoire du créneau (format attendu: "date heure-heure auditoire")
        const parts = timeSlot.split(' ');
        if (parts.length >= 3) {
          const auditoire = parts.slice(2).join(' ').toLowerCase();
          auditoiresDetectes.add(auditoire);
          
          if (contraintesAuditoires.has(auditoire)) {
            creneauxValides++;
          }
        }
      });
    });

    const auditoiresNonReconnus = Array.from(auditoiresDetectes).filter(
      auditoire => !contraintesAuditoires.has(auditoire)
    );

    return {
      validationPassed: auditoiresNonReconnus.length === 0,
      auditoiresNonReconnus,
      totalCreneaux,
      creneauxValides
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const data = await parseCallyFile(selectedFile);
      setPreview(data);
      
      // Valider les auditoires
      const validation = validateAuditoires(data);
      setValidationResult(validation);
      
      toast({
        title: "Fichier analysé",
        description: `${data.length} surveillants trouvés. ${validation.validationPassed ? 'Tous les auditoires sont reconnus.' : `${validation.auditoiresNonReconnus.length} auditoire(s) non reconnu(s).`}`
      });
    } catch (error: any) {
      toast({
        title: "Erreur de parsing",
        description: error.message,
        variant: "destructive"
      });
      setPreview([]);
      setValidationResult(null);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (data: CallyData[]) => {
      if (!activeSession) throw new Error('Aucune session active');

      // Récupérer les surveillants existants
      const { data: existingSurveillants, error: surveillantsError } = await supabase
        .from('surveillants')
        .select('id, email');

      if (surveillantsError) throw surveillantsError;

      // Récupérer les créneaux d'examens
      const { data: examens, error: examensError } = await supabase
        .from('examens')
        .select('date_examen, heure_debut, heure_fin')
        .eq('session_id', activeSession.id);

      if (examensError) throw examensError;

      // Créer une map email -> surveillant_id
      const emailToId = new Map<string, string>();
      existingSurveillants.forEach(s => {
        emailToId.set(s.email.toLowerCase(), s.id);
      });

      // Préparer les disponibilités à insérer
      const disponibilitesToInsert: any[] = [];

      data.forEach(callyData => {
        const surveillantId = emailToId.get(callyData.email);
        if (!surveillantId) {
          console.warn(`Surveillant non trouvé pour l'email: ${callyData.email}`);
          return;
        }

        Object.entries(callyData.disponibilites).forEach(([timeSlotLabel, isAvailable]) => {
          // Essayer de matcher le créneau avec les examens existants
          // Format attendu: "2024-01-15 09:00-11:00"
          const match = timeSlotLabel.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
          if (!match) return;

          const [, date, heureDebut, heureFin] = match;
          
          // Vérifier que ce créneau existe dans les examens
          const examenExists = examens.some(e => 
            e.date_examen === date && 
            e.heure_debut === heureDebut && 
            e.heure_fin === heureFin
          );

          if (examenExists) {
            disponibilitesToInsert.push({
              surveillant_id: surveillantId,
              session_id: activeSession.id,
              date_examen: date,
              heure_debut: heureDebut,
              heure_fin: heureFin,
              est_disponible: isAvailable
            });
          }
        });
      });

      // Supprimer les anciennes disponibilités pour cette session
      await supabase
        .from('disponibilites')
        .delete()
        .eq('session_id', activeSession.id);

      // Insérer les nouvelles disponibilités
      if (disponibilitesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('disponibilites')
          .insert(disponibilitesToInsert);

        if (insertError) throw insertError;
      }

      return disponibilitesToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['disponibilites'] });
      toast({
        title: "Import réussi",
        description: `${count} disponibilités ont été importées avec succès.`
      });
      setFile(null);
      setPreview([]);
      setValidationResult(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleImport = () => {
    if (preview.length === 0) return;
    setImporting(true);
    importMutation.mutate(preview);
    setImporting(false);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune session active. Veuillez d'abord activer une session.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Import Cally avec Validation Auditoires</span>
        </CardTitle>
        <CardDescription>
          Importez les disponibilités depuis un fichier Cally avec validation automatique des auditoires
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Format attendu :</strong> Le fichier doit contenir les colonnes "Surveillant", "Email", "Type", 
            suivies des créneaux horaires au format "YYYY-MM-DD HH:MM-HH:MM Auditoire". 
            Les auditoires seront automatiquement validés contre les contraintes existantes.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="cally-file">Sélectionner le fichier Cally</Label>
          <Input
            id="cally-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
        </div>

        {validationResult && (
          <Alert className={validationResult.validationPassed ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            {validationResult.validationPassed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className={validationResult.validationPassed ? "text-green-800" : "text-orange-800"}>
                  <strong>Validation des auditoires:</strong> {validationResult.creneauxValides}/{validationResult.totalCreneaux} créneaux reconnus
                </div>
                {!validationResult.validationPassed && (
                  <div className="text-orange-700 text-sm">
                    <strong>Auditoires non reconnus:</strong> {validationResult.auditoiresNonReconnus.join(', ')}
                    <br />
                    <em>Veuillez d'abord corriger ces auditoires dans la section "Validation des Auditoires"</em>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {preview.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Aperçu de l'import</h4>
              <p className="text-sm text-blue-700">
                {preview.length} surveillants détectés avec leurs disponibilités.
              </p>
              <div className="mt-2 space-y-1 text-xs text-blue-600">
                {preview.slice(0, 3).map((item, index) => (
                  <div key={index}>
                    {item.surveillant} ({item.email}) - {item.type} - {Object.values(item.disponibilites).filter(Boolean).length} créneaux disponibles
                  </div>
                ))}
                {preview.length > 3 && <div>... et {preview.length - 3} autres</div>}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleImport} 
                disabled={importing || importMutation.isPending || (validationResult && !validationResult.validationPassed)}
              >
                {importing || importMutation.isPending ? 'Import en cours...' : 'Importer les disponibilités'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setValidationResult(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
