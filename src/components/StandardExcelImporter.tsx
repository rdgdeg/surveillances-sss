
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface StandardExamenData {
  jour: string;
  duree: number;
  heure_debut: string;
  heure_fin: string;
  activite: string;
  code: string;
  auditoires: string;
  etudiants: number;
  enseignants: string;
}

interface ProcessingResult {
  total_lignes: number;
  examens_generes: number;
  validations_automatiques: number;
  validations_manuelles: number;
  rejetes: number;
  auditoires_separes: number;
}

export const StandardExcelImporter = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingResult | null>(null);

  const importStandardExcelMutation = useMutation({
    mutationFn: async (examensData: StandardExamenData[]) => {
      if (!activeSession?.id) throw new Error("Aucune session active");

      const results: ProcessingResult = {
        total_lignes: 0,
        examens_generes: 0,
        validations_automatiques: 0,
        validations_manuelles: 0,
        rejetes: 0,
        auditoires_separes: 0
      };

      for (const ligne of examensData) {
        try {
          results.total_lignes++;

          // Extraire le code d'examen depuis la colonne "Activité"
          const codeExamen = extraireCodeExamen(ligne.activite);
          
          // Classifier le code d'examen
          const { data: classification } = await supabase
            .rpc('classifier_code_examen', { 
              code_original: codeExamen 
            });

          if (!classification || classification.length === 0) {
            console.warn(`Impossible de classifier le code: ${codeExamen}`);
            continue;
          }

          const classif = classification[0];

          // Si c'est rejeté (oral), on skip
          if (classif.statut_validation === 'REJETE') {
            results.rejetes++;
            continue;
          }

          // Séparer les auditoires multiples
          const auditoires = separerAuditoires(ligne.auditoires);
          results.auditoires_separes += auditoires.length;

          // Créer un examen par auditoire
          for (const auditoire of auditoires) {
            const examenData = {
              session_id: activeSession.id,
              code_examen: codeExamen,
              matiere: ligne.activite.split('=')[0], // Partie avant le =
              date_examen: formatDateFromJour(ligne.jour),
              heure_debut: ligne.heure_debut,
              heure_fin: ligne.heure_fin,
              salle: auditoire.trim(),
              nombre_surveillants: calculerNombreSurveillants(ligne.etudiants),
              type_requis: 'Assistant',
              statut_validation: 'EN_COURS'
            };

            // Insérer l'examen
            const { data: examen, error: examenError } = await supabase
              .from('examens')
              .insert(examenData)
              .select()
              .single();

            if (examenError) throw examenError;

            // Insérer la validation
            const { error: validationError } = await supabase
              .from('examens_validation')
              .insert({
                examen_id: examen.id,
                code_original: codeExamen,
                type_detecte: classif.type_detecte,
                statut_validation: classif.statut_validation,
                commentaire: classif.commentaire
              });

            if (validationError) throw validationError;

            results.examens_generes++;

            // Compter les statuts de validation
            switch (classif.statut_validation) {
              case 'VALIDE':
                results.validations_automatiques++;
                break;
              case 'NECESSITE_VALIDATION':
                results.validations_manuelles++;
                break;
            }
          }

        } catch (error: any) {
          console.error(`Erreur pour la ligne ${ligne.activite}:`, error);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setProcessingStats(results);
      queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });

      toast({
        title: "Import terminé avec succès",
        description: `${results.examens_generes} examens créés à partir de ${results.total_lignes} lignes Excel. ${results.auditoires_separes} auditoires séparés.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'import",
        description: error.message || "Une erreur s'est produite lors de l'import.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const extraireCodeExamen = (activite: string): string => {
    // Extraire le code depuis "WDENT2152=E" → "WDENT2152=E"
    if (activite.includes('=')) {
      return activite;
    }
    // Si pas de =, retourner tel quel pour validation manuelle
    return activite;
  };

  const separerAuditoires = (auditoires: string): string[] => {
    // Séparer "51 A - Lacroix, 51 C, 51 B" → ["51 A - Lacroix", "51 C", "51 B"]
    return auditoires.split(',').map(a => a.trim()).filter(a => a.length > 0);
  };

  const calculerNombreSurveillants = (nombreEtudiants: number): number => {
    // Logique basique : 1 surveillant pour 30 étudiants, minimum 1
    return Math.max(1, Math.ceil(nombreEtudiants / 30));
  };

  const formatDateFromJour = (jour: string): string => {
    // Gérer différents formats de date possibles
    try {
      // Si c'est déjà au format YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
        return jour;
      }
      
      // Si c'est au format DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(jour)) {
        const [day, month, year] = jour.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Autres formats - essayer de parser avec Date
      const date = new Date(jour);
      return date.toISOString().split('T')[0];
    } catch {
      // Fallback - date du jour
      return new Date().toISOString().split('T')[0];
    }
  };

  const parseStandardExcel = async (file: File): Promise<StandardExamenData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Prendre la première feuille
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Vérifier qu'on a au moins un en-tête et des données
          if (jsonData.length < 2) {
            reject(new Error("Le fichier doit contenir au moins un en-tête et une ligne de données"));
            return;
          }

          const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
          const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null));

          // Mapper selon votre format standard
          const examensData: StandardExamenData[] = rows.map(row => ({
            jour: String(row[0] || '').trim(),
            duree: parseFloat(String(row[1] || '0')),
            heure_debut: formatTime(row[2]),
            heure_fin: formatTime(row[3]),
            activite: String(row[4] || '').trim(),
            code: String(row[5] || '').trim(),
            auditoires: String(row[6] || '').trim(),
            etudiants: parseInt(String(row[7] || '0')),
            enseignants: String(row[8] || '').trim()
          })).filter(exam => exam.activite && exam.auditoires);

          console.log('Données Excel parsées:', examensData);
          resolve(examensData);
        } catch (error) {
          reject(new Error("Impossible de lire le fichier Excel. Vérifiez le format."));
        }
      };
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  };

  const formatTime = (value: any): string => {
    if (!value) return '08:00';
    
    // Si c'est un nombre (fraction de jour Excel)
    if (typeof value === 'number') {
      const hours = Math.floor(value * 24);
      const minutes = Math.floor((value * 24 * 60) % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Si c'est déjà une chaîne d'heure
    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/[^\d:]/g, '');
      if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        return cleaned;
      }
    }
    
    return '08:00';
  };

  const handleFileUpload = async (file: File) => {
    if (!activeSession?.id) {
      toast({
        title: "Session manquante",
        description: "Veuillez sélectionner une session active avant d'importer.",
        variant: "destructive"
      });
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Format non supporté",
        description: "Veuillez utiliser un fichier Excel (.xlsx ou .xls).",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStats(null);

    try {
      const examensData = await parseStandardExcel(file);
      
      if (examensData.length === 0) {
        throw new Error("Aucun examen valide trouvé dans le fichier");
      }

      importStandardExcelMutation.mutate(examensData);

    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Erreur de lecture",
        description: error.message || "Impossible de lire le fichier.",
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Import Excel Standard des Examens</span>
        </CardTitle>
        <CardDescription>
          Importez le fichier Excel standardisé du secrétariat avec séparation automatique des auditoires
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProcessing && !processingStats && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Glissez votre fichier Excel ici</p>
              <p className="text-sm text-gray-500">Format : Jour | Durée | Début | Fin | Activité | Code | Auditoires | Étudiants | Enseignants</p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Parcourir les fichiers</span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-sm text-gray-600">
              Traitement et séparation des auditoires en cours...
            </p>
          </div>
        )}

        {processingStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{processingStats.total_lignes}</div>
                <div className="text-sm text-blue-800">Lignes Excel</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{processingStats.examens_generes}</div>
                <div className="text-sm text-green-800">Examens générés</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{processingStats.auditoires_separes}</div>
                <div className="text-sm text-purple-800">Auditoires séparés</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{processingStats.validations_automatiques}</div>
                <div className="text-sm text-green-800">Validés auto</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{processingStats.validations_manuelles}</div>
                <div className="text-sm text-orange-800">À valider</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{processingStats.rejetes}</div>
                <div className="text-sm text-red-800">Rejetés (oraux)</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setProcessingStats(null)}
                variant="outline"
              >
                Importer d'autres examens
              </Button>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Format Excel attendu :</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Colonne A :</strong> Jour (date de l'examen)</div>
            <div><strong>Colonne B :</strong> Durée (h) (durée en heures)</div>
            <div><strong>Colonne C :</strong> Début (heure de début)</div>
            <div><strong>Colonne D :</strong> Fin (heure de fin)</div>
            <div><strong>Colonne E :</strong> Activité (contient le code d'examen, ex: WDENT2152=E)</div>
            <div><strong>Colonne F :</strong> Code (code supplémentaire)</div>
            <div><strong>Colonne G :</strong> Auditoires (salles séparées par virgules, ex: 51 A - Lacroix, 51 C, 51 B)</div>
            <div><strong>Colonne H :</strong> Étudiants (nombre d'étudiants)</div>
            <div><strong>Colonne I :</strong> Enseignants (noms des enseignants)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
