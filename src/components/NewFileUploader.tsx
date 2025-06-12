
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, FileSpreadsheet, X, AlertCircle } from "lucide-react";
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

export const NewFileUploader = ({ title, description, fileType, expectedFormat, onUpload, uploaded }: NewFileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { data: activeSession } = useActiveSession();

  const parseCSV = (csvText: string): string[][] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    return lines.map(line => line.split(';').map(cell => cell.trim()));
  };

  const processData = async (data: string[][], fileType: string) => {
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

  const processSurveillants = async (headers: string[], rows: string[][], sessionId: string) => {
    const surveillants = rows.map(row => ({
      nom: row[0],
      prenom: row[1],
      email: row[2],
      type: row[3],
      statut: row[4] || 'actif'
    }));

    // Insert or update surveillants
    for (const surveillant of surveillants) {
      const { data: existing } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', surveillant.email)
        .single();

      if (existing) {
        await supabase
          .from('surveillants')
          .update(surveillant)
          .eq('email', surveillant.email);
      } else {
        const { data: newSurveillant } = await supabase
          .from('surveillants')
          .insert(surveillant)
          .select('id')
          .single();

        // Add to current session with default quota
        if (newSurveillant) {
          const defaultQuota = surveillant.type === 'PAT' ? 12 : 6;
          await supabase
            .from('surveillant_sessions')
            .insert({
              surveillant_id: newSurveillant.id,
              session_id: sessionId,
              quota: defaultQuota
            });
        }
      }
    }

    return { processed: surveillants.length, type: 'surveillants' };
  };

  const processExamens = async (headers: string[], rows: string[][], sessionId: string) => {
    const examens = rows.map(row => ({
      session_id: sessionId,
      date_examen: row[0],
      heure_debut: row[1],
      heure_fin: row[2],
      matiere: row[3],
      salle: row[4],
      nombre_surveillants: parseInt(row[5]) || 1,
      type_requis: row[6]
    }));

    const { error } = await supabase
      .from('examens')
      .insert(examens);

    if (error) throw error;

    return { processed: examens.length, type: 'examens' };
  };

  const processIndisponibilites = async (headers: string[], rows: string[][], sessionId: string) => {
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

  const processQuotas = async (headers: string[], rows: string[][], sessionId: string) => {
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
        description: `${result.processed} ${result.type} importé(s) avec succès.`,
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

  return (
    <Card className={`transition-all duration-200 ${uploaded ? 'border-green-200 bg-green-50' : isDragOver ? 'border-blue-300 bg-blue-50' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>{title}</span>
          </div>
          {uploaded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetUpload}
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
              <Badge key={index} variant="secondary" className="text-xs">
                {column}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
