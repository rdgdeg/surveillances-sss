import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, FileSpreadsheet, X, AlertCircle, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface NewFileUploaderProps {
  title: string;
  description: string;
  fileType: 'surveillants' | 'examens' | 'indisponibilites' | 'quotas';
  expectedFormat: string[];
  onUpload: (success: boolean) => void;
  uploaded: boolean;
}

interface ProcessResult {
  processed: number;
  type: string;
  excluded?: number;
  updated?: number;
  message?: string;
}

export const NewFileUploader = ({ title, description, fileType, expectedFormat, onUpload, uploaded }: NewFileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { data: activeSession } = useActiveSession();

  const parseCSV = (csvText: string): string[][] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    return lines.map(line => line.split(';').map(cell => cell.trim()));
  };

  const processData = async (data: string[][], fileType: string): Promise<ProcessResult> => {
    if (!activeSession) {
      throw new Error("Aucune session active");
    }

    const headers = data[0];
    const rows = data.slice(1);

    console.log(`Processing ${fileType} data:`, { headers, rows });

    switch (fileType) {
      case 'surveillants':
        return await processSurveillants(headers, rows, activeSession.id);
      case 'examens':
        return await processExamens(headers, rows, activeSession.id);
      case 'indisponibilites':
        return await processIndisponibilites(headers, rows, activeSession.id);
      case 'quotas':
        return await processQuotas(headers, rows, activeSession.id);
      default:
        throw new Error(`Type de fichier non supporté: ${fileType}`);
    }
  };

  const processSurveillants = async (headers: string[], rows: string[][], sessionId: string): Promise<ProcessResult> => {
    let processed = 0;
    let updated = 0;
    let excluded = 0;

    // Vérifier les colonnes requises selon le template
    const requiredColumns = ['nom', 'prenom', 'email', 'type'];
    const headerLower = headers.map(h => h.toLowerCase());
    
    for (const required of requiredColumns) {
      if (!headerLower.includes(required)) {
        throw new Error(`Colonne manquante: ${required}`);
      }
    }

    for (const row of rows) {
      if (row.length === 0 || !row[0] || !row[1] || !row[2]) continue; // Skip empty rows

      const surveillantData: any = {
        nom: row[0],
        prenom: row[1], 
        email: row[2],
        type: row[3],
        statut: 'actif'
      };

      // Ajouter les colonnes optionnelles selon l'ordre du template
      if (row.length > 4 && row[4]) surveillantData.faculte_interdite = row[4];
      if (row.length > 5 && row[5]) {
        const eftValue = parseFloat(row[5]);
        surveillantData.eft = !isNaN(eftValue) ? eftValue : null;
      }
      if (row.length > 6 && row[6]) surveillantData.affectation_fac = row[6];
      if (row.length > 7 && row[7]) surveillantData.date_fin_contrat = row[7];
      if (row.length > 8 && row[8]) surveillantData.telephone_gsm = row[8];
      if (row.length > 9 && row[9]) surveillantData.campus = row[9];

      console.log('Processing CSV surveillant:', surveillantData);

      // Vérifier si c'est un surveillant FSM (à exclure)
      if (surveillantData.affectation_fac?.toUpperCase().includes('FSM')) {
        console.log(`Exclusion surveillant FSM: ${surveillantData.email}`);
        excluded++;
        continue;
      }

      // Vérifier la validité du contrat
      if (surveillantData.date_fin_contrat) {
        const endDate = new Date(surveillantData.date_fin_contrat);
        const today = new Date();
        if (endDate <= today) {
          console.log(`Exclusion contrat expiré: ${surveillantData.email}`);
          excluded++;
          continue;
        }
      }

      // Check for existing surveillant by email to avoid duplicates
      const { data: existing, error: checkError } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', surveillantData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing surveillant:', checkError);
        throw checkError;
      }

      if (existing) {
        // Update existing surveillant
        const { error: updateError } = await supabase
          .from('surveillants')
          .update(surveillantData)
          .eq('email', surveillantData.email);

        if (updateError) {
          console.error('Error updating surveillant:', updateError);
          throw updateError;
        }

        updated++;
        console.log('Updated existing surveillant:', surveillantData.email);

        // Check if already in session
        const { data: inSession } = await supabase
          .from('surveillant_sessions')
          .select('id')
          .eq('surveillant_id', existing.id)
          .eq('session_id', sessionId)
          .single();

        if (!inSession) {
          // Add to session if not already there
          let defaultQuota = surveillantData.type === 'PAT' ? 12 : 6;
          
          if (surveillantData.eft && surveillantData.eft > 0) {
            defaultQuota = Math.round(defaultQuota * surveillantData.eft);
            defaultQuota = Math.max(1, defaultQuota);
          }

          await supabase
            .from('surveillant_sessions')
            .insert({
              surveillant_id: existing.id,
              session_id: sessionId,
              quota: defaultQuota
            });
        }
      } else {
        // Insert new surveillant
        const { data: newSurveillant, error: insertError } = await supabase
          .from('surveillants')
          .insert(surveillantData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting surveillant:', insertError);
          throw insertError;
        }

        console.log('Inserted new surveillant:', newSurveillant);

        // Add to current session with adjusted quota based on EFT
        if (newSurveillant) {
          let defaultQuota = surveillantData.type === 'PAT' ? 12 : 6;
          
          // Ajuster le quota selon l'EFT
          if (surveillantData.eft && surveillantData.eft > 0) {
            defaultQuota = Math.round(defaultQuota * surveillantData.eft);
            defaultQuota = Math.max(1, defaultQuota); // Minimum 1
          }

          const { error: sessionError } = await supabase
            .from('surveillant_sessions')
            .insert({
              surveillant_id: newSurveillant.id,
              session_id: sessionId,
              quota: defaultQuota
            });

          if (sessionError) {
            console.error('Error adding to session:', sessionError);
            throw sessionError;
          }

          processed++;
          console.log('Added to session with quota:', defaultQuota);
        }
      }
    }

    let message = `${processed} nouveaux, ${updated} mis à jour`;
    if (excluded > 0) message += `, ${excluded} exclus (FSM/contrat expiré)`;

    return { 
      processed: processed + updated, 
      type: 'surveillants',
      excluded,
      updated,
      message
    };
  };

  const processExamens = async (headers: string[], rows: string[][], sessionId: string): Promise<ProcessResult> => {
    const examens = rows.map(row => ({
      session_id: sessionId,
      date_examen: row[0],
      heure_debut: row[1],
      heure_fin: row[2],
      matiere: row[3],
      salle: row[4],
      nombre_surveillants: parseInt(row[5]) || 1,
      type_requis: row[6],
      faculte: row[7] || null, // Nouvelle colonne faculté
      auditoire_original: row[8] || null
    }));

    const { error } = await supabase
      .from('examens')
      .insert(examens);

    if (error) throw error;

    return { processed: examens.length, type: 'examens' };
  };

  const processIndisponibilites = async (headers: string[], rows: string[][], sessionId: string): Promise<ProcessResult> => {
    const indisponibilites = [];

    for (const row of rows) {
      const { data: surveillant } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', row[0])
        .single();

      if (surveillant) {
        indisponibilites.push({
          surveillant_id: surveillant.id,
          session_id: sessionId,
          date_debut: row[1],
          date_fin: row[2],
          motif: row[3] || null
        });
      }
    }

    const { error } = await supabase
      .from('indisponibilites')
      .insert(indisponibilites);

    if (error) throw error;

    return { processed: indisponibilites.length, type: 'indisponibilites' };
  };

  const processQuotas = async (headers: string[], rows: string[][], sessionId: string): Promise<ProcessResult> => {
    let updated = 0;

    for (const row of rows) {
      const { data: surveillant } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', row[0])
        .single();

      if (surveillant) {
        const { error } = await supabase
          .from('surveillant_sessions')
          .update({
            quota: parseInt(row[1]) || 6,
            sessions_imposees: parseInt(row[2]) || 0
          })
          .eq('surveillant_id', surveillant.id)
          .eq('session_id', sessionId);

        if (!error) updated++;
      }
    }

    return { processed: updated, type: 'quotas' };
  };

  const handleFileUpload = async (file: File) => {
    if (!activeSession) {
      toast({
        title: "Erreur",
        description: "Aucune session active. Veuillez d'abord activer une session.",
        variant: "destructive"
      });
      return;
    }

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Format non supporté",
        description: "Veuillez utiliser un fichier CSV (séparateur point-virgule).",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length < 2) {
        throw new Error("Le fichier doit contenir au moins une ligne de données");
      }

      const result = await processData(data, fileType);
      
      toast({
        title: "Import réussi",
        description: result.message || `${result.processed} ${result.type} importé(s) avec succès.`,
        variant: "default"
      });
      
      onUpload(true);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'import",
        description: error.message || "Une erreur s'est produite lors du traitement du fichier.",
        variant: "destructive"
      });
      onUpload(false);
      setFileName("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
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

  const resetUpload = () => {
    setFileName("");
    onUpload(false);
  };

  const isSensitiveFileType = fileType === 'surveillants';

  return (
    <Card className={`transition-all duration-200 ${uploaded ? 'border-green-200 bg-green-50' : isDragOver ? 'border-blue-300 bg-blue-50' : ''} ${isSensitiveFileType ? 'border-l-4 border-l-red-500' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>{title}</span>
            {isSensitiveFileType && (
              <div>
                <Shield className="h-4 w-4 text-red-600" />
              </div>
            )}
          </div>
          {uploaded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFileName("");
                onUpload(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeSession && (
          <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 text-sm">Aucune session active - activez une session pour importer</span>
          </div>
        )}

        {isSensitiveFileType && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <Shield className="h-5 w-5 text-red-600" />
            <div className="text-red-800 text-sm">
              <p className="font-medium">Données sensibles incluses :</p>
              <p className="text-xs mt-1">EFT, affectations, contrats, GSM - Exclusion automatique FSM - Gestion des doublons par email</p>
            </div>
          </div>
        )}

        {!uploaded ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            } ${!activeSession ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-2">
                <div className="animate-spin mx-auto w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="text-sm text-gray-600">Traitement en cours...</p>
                {fileName && (
                  <p className="text-xs text-gray-500">{fileName}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Glissez votre fichier CSV ici ou
                  </p>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild disabled={!activeSession}>
                      <span>Parcourir</span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileSelect}
                      disabled={!activeSession}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Format : CSV avec séparateur point-virgule (;)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-3 p-4 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-green-800">Fichier importé avec succès</p>
              {fileName && (
                <p className="text-sm text-green-600">{fileName}</p>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Format attendu :</h4>
          <div className="flex flex-wrap gap-1">
            {expectedFormat.map((column, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`text-xs ${
                  ['eft', 'affectation_fac', 'date_fin_contrat', 'telephone_gsm', 'campus'].includes(column) 
                    ? 'bg-red-100 text-red-800 border-red-300' 
                    : ''
                }`}
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
