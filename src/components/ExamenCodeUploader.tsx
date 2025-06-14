
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface ExamenImportData {
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  nombre_surveillants: number;
  type_requis: string;
}

export const ExamenCodeUploader = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    valides: number;
    rejetes: number;
    necessitent_validation: number;
  } | null>(null);

  const importExamensMutation = useMutation({
    mutationFn: async (examensData: ExamenImportData[]) => {
      if (!activeSession?.id) throw new Error("Aucune session active");

      const results = {
        total: 0,
        valides: 0,
        rejetes: 0,
        necessitent_validation: 0,
        errors: [] as string[]
      };

      for (const examenData of examensData) {
        try {
          results.total++;

          // Insérer l'examen
          const { data: examen, error: examenError } = await supabase
            .from('examens')
            .insert({
              session_id: activeSession.id,
              code_examen: examenData.code_examen,
              matiere: examenData.matiere,
              date_examen: examenData.date_examen,
              heure_debut: examenData.heure_debut,
              heure_fin: examenData.heure_fin,
              salle: examenData.salle,
              nombre_surveillants: examenData.nombre_surveillants || 1,
              type_requis: examenData.type_requis || 'Assistant',
              statut_validation: 'EN_COURS'
            })
            .select()
            .single();

          if (examenError) throw examenError;

          // Classifier automatiquement le code d'examen
          const { data: classification } = await supabase
            .rpc('classifier_code_examen', { 
              code_original: examenData.code_examen 
            });

          if (classification && classification.length > 0) {
            const classif = classification[0];

            // Insérer la validation
            const { error: validationError } = await supabase
              .from('examens_validation')
              .insert({
                examen_id: examen.id,
                code_original: examenData.code_examen,
                type_detecte: classif.type_detecte,
                statut_validation: classif.statut_validation,
                commentaire: classif.commentaire
              });

            if (validationError) throw validationError;

            // Compter les statuts
            switch (classif.statut_validation) {
              case 'VALIDE':
                results.valides++;
                break;
              case 'REJETE':
                results.rejetes++;
                break;
              case 'NECESSITE_VALIDATION':
                results.necessitent_validation++;
                break;
            }
          }

        } catch (error: any) {
          results.errors.push(`Erreur pour ${examenData.code_examen}: ${error.message}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setUploadStats({
        total: results.total,
        valides: results.valides,
        rejetes: results.rejetes,
        necessitent_validation: results.necessitent_validation
      });

      queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });

      toast({
        title: "Import terminé",
        description: `${results.total} examens traités. ${results.valides} validés automatiquement, ${results.necessitent_validation} nécessitent une validation manuelle.`,
      });

      if (results.errors.length > 0) {
        console.warn("Erreurs d'import:", results.errors);
      }
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

  const handleFileUpload = async (file: File) => {
    if (!activeSession?.id) {
      toast({
        title: "Session manquante",
        description: "Veuillez sélectionner une session active avant d'importer.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setUploadStats(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Supposer que la première ligne contient les en-têtes
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      // Mapper les colonnes (ajuster selon le format de votre fichier)
      const examensData: ExamenImportData[] = rows
        .filter(row => row.length > 0 && row[0]) // Filtrer les lignes vides
        .map(row => ({
          code_examen: String(row[0] || '').trim(),
          matiere: String(row[1] || '').trim(),
          date_examen: formatDate(row[2]),
          heure_debut: formatTime(row[3]),
          heure_fin: formatTime(row[4]),
          salle: String(row[5] || '').trim(),
          nombre_surveillants: parseInt(String(row[6])) || 1,
          type_requis: String(row[7] || 'Assistant').trim()
        }))
        .filter(exam => exam.code_examen && exam.matiere); // Filtrer les données invalides

      if (examensData.length === 0) {
        throw new Error("Aucun examen valide trouvé dans le fichier");
      }

      importExamensMutation.mutate(examensData);

    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Erreur de lecture",
        description: error.message || "Impossible de lire le fichier.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    
    // Si c'est un nombre (date Excel)
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Si c'est déjà une chaîne de date
    if (typeof value === 'string') {
      try {
        const date = new Date(value);
        return date.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    }
    
    return new Date().toISOString().split('T')[0];
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
      // Nettoyer et formater
      const cleaned = value.trim().replace(/[^\d:]/g, '');
      if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
        return cleaned;
      }
    }
    
    return '08:00';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
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
    <Card className="border-uclouvain-blue-grey">
      <CardHeader className="bg-gradient-uclouvain text-white">
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Import des Codes d'Examens</span>
        </CardTitle>
        <CardDescription className="text-blue-100">
          Importez un fichier Excel contenant les codes d'examens pour classification automatique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProcessing && !uploadStats && (
          <div
            className="border-2 border-dashed border-uclouvain-blue-grey rounded-lg p-8 text-center hover:border-uclouvain-cyan transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-uclouvain-blue-grey mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-uclouvain-blue">Glissez votre fichier Excel ici</p>
              <p className="text-sm text-uclouvain-blue-grey">
                ou cliquez pour sélectionner
              </p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild className="border-uclouvain-blue text-uclouvain-blue hover:bg-blue-50">
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
            <div className="mt-4 text-xs text-uclouvain-blue-grey">
              <p>Format attendu : Code | Matière | Date | Heure Début | Heure Fin | Salle | Nb Surveillants | Type</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-uclouvain-cyan border-t-transparent rounded-full mb-4"></div>
            <p className="text-sm text-uclouvain-blue">
              Traitement et classification des examens en cours...
            </p>
          </div>
        )}

        {uploadStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-uclouvain-blue-grey">
                <div className="text-2xl font-bold text-uclouvain-blue">{uploadStats.total}</div>
                <div className="text-sm text-uclouvain-blue">Total traités</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600">{uploadStats.valides}</div>
                <div className="text-sm text-green-800">Validés auto</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{uploadStats.necessitent_validation}</div>
                <div className="text-sm text-orange-800">À valider</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                <div className="text-2xl font-bold text-red-600">{uploadStats.rejetes}</div>
                <div className="text-sm text-red-800">Rejetés</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setUploadStats(null)}
                variant="outline"
                className="border-uclouvain-blue text-uclouvain-blue hover:bg-blue-50"
              >
                Importer d'autres examens
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
