import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { SurveillantImportReview } from "./SurveillantImportReview";
import * as XLSX from 'xlsx';

interface ExcelFileUploaderProps {
  title: string;
  description: string;
  fileType: 'surveillants' | 'examens' | 'indisponibilites' | 'quotas' | 'disponibilites';
  expectedFormat: string[];
  onUpload: (success: boolean) => void;
  uploaded: boolean;
}

interface SurveillantCandidate {
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
  isValid: boolean;
  errors: string[];
  exists: boolean;
}

export const ExcelFileUploader = ({ title, description, fileType, expectedFormat, onUpload, uploaded }: ExcelFileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [candidates, setCandidates] = useState<SurveillantCandidate[]>([]);
  const { data: activeSession } = useActiveSession();

  const parseExcelFile = async (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let sheetName = 'Données';
          if (!workbook.Sheets[sheetName]) {
            sheetName = workbook.SheetNames[0];
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          const filteredData = jsonData.filter((row: any) => 
            row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined)
          ) as string[][];
          
          if (filteredData.length < 2) {
            reject(new Error("Le fichier doit contenir au moins un en-tête et une ligne de données"));
            return;
          }
          
          resolve(filteredData);
        } catch (error) {
          reject(new Error("Impossible de lire le fichier Excel. Vérifiez le format."));
        }
      };
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateSurveillantCandidate = async (surveillant: any): Promise<SurveillantCandidate> => {
    const errors: string[] = [];
    const validTypes = ['PAT', 'Assistant', 'Jobiste'];
    const validStatuts = ['actif', 'inactif'];

    // Validation des champs requis
    if (!surveillant.nom) errors.push("Nom manquant");
    if (!surveillant.prenom) errors.push("Prénom manquant");
    if (!surveillant.email) errors.push("Email manquant");
    if (!surveillant.type) errors.push("Type manquant");

    // Validation du type
    if (surveillant.type && !validTypes.includes(surveillant.type)) {
      errors.push(`Type invalide: ${surveillant.type}`);
    }

    // Validation du statut
    if (surveillant.statut && !validStatuts.includes(surveillant.statut)) {
      errors.push(`Statut invalide: ${surveillant.statut}`);
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (surveillant.email && !emailRegex.test(surveillant.email)) {
      errors.push("Format d'email invalide");
    }

    // Vérifier si le surveillant existe déjà
    let exists = false;
    if (surveillant.email) {
      const { data: existing } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', surveillant.email)
        .single();
      exists = !!existing;
    }

    return {
      ...surveillant,
      isValid: errors.length === 0,
      errors,
      exists
    };
  };

  const processSurveillantCandidates = async (headers: string[], rows: string[][]): Promise<SurveillantCandidate[]> => {
    const candidatesPromises = rows.map(async (row) => {
      const surveillant: any = {};
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : "";
        switch (header.toLowerCase()) {
          case 'nom':
            surveillant.nom = value;
            break;
          case 'prénom':
          case 'prenom':
            surveillant.prenom = value;
            break;
          case 'email':
            surveillant.email = value;
            break;
          case 'type':
            surveillant.type = value;
            break;
          case 'statut':
            surveillant.statut = value || 'actif';
            break;
        }
      });
      
      return await validateSurveillantCandidate(surveillant);
    });

    return await Promise.all(candidatesPromises);
  };

  const importApprovedSurveillants = async (approvedCandidates: SurveillantCandidate[]) => {
    if (!activeSession) {
      throw new Error("Aucune session active");
    }

    let imported = 0;
    for (const surveillant of approvedCandidates) {
      if (surveillant.exists) {
        // Mise à jour
        await supabase
          .from('surveillants')
          .update({
            nom: surveillant.nom,
            prenom: surveillant.prenom,
            type: surveillant.type,
            statut: surveillant.statut
          })
          .eq('email', surveillant.email);
        imported++;
      } else {
        // Création
        const { data: newSurveillant } = await supabase
          .from('surveillants')
          .insert({
            nom: surveillant.nom,
            prenom: surveillant.prenom,
            email: surveillant.email,
            type: surveillant.type,
            statut: surveillant.statut
          })
          .select('id')
          .single();

        if (newSurveillant) {
          const defaultQuota = surveillant.type === 'PAT' ? 12 : surveillant.type === 'Assistant' ? 6 : 4;
          await supabase
            .from('surveillant_sessions')
            .insert({
              surveillant_id: newSurveillant.id,
              session_id: activeSession.id,
              quota: defaultQuota
            });
          imported++;
        }
      }
    }

    return imported;
  };

  const processData = async (data: string[][], fileType: string) => {
    if (!activeSession) {
      throw new Error("Aucune session active");
    }

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null));

    console.log(`Processing ${fileType} data:`, { headers, rows });

    const expectedHeaders = expectedFormat;
    const missingHeaders = expectedHeaders.filter(expected => 
      !headers.some(header => header.toLowerCase() === expected.toLowerCase())
    );
    
    if (missingHeaders.length > 0) {
      throw new Error(`Colonnes manquantes: ${missingHeaders.join(', ')}`);
    }

    if (fileType === 'surveillants') {
      const candidatesList = await processSurveillantCandidates(headers, rows);
      setCandidates(candidatesList);
      setShowReview(true);
      return null; // Pas d'import direct, on passe par la révision
    }

    switch (fileType) {
      case 'examens':
        return await processExamens(headers, rows, activeSession.id);
      case 'indisponibilites':
        return await processIndisponibilites(headers, rows, activeSession.id);
      case 'disponibilites':
        return await processDisponibilites(headers, rows, activeSession.id);
      case 'quotas':
        return await processQuotas(headers, rows, activeSession.id);
      default:
        throw new Error(`Type de fichier non supporté: ${fileType}`);
    }
  };

  const processExamens = async (headers: string[], rows: string[][], sessionId: string) => {
    const examens = rows.map(row => {
      const examen: any = { session_id: sessionId };
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : "";
        switch (header.toLowerCase()) {
          case 'date':
            examen.date_examen = value;
            break;
          case 'heure début':
          case 'heure debut':
            examen.heure_debut = value;
            break;
          case 'heure fin':
            examen.heure_fin = value;
            break;
          case 'matière':
          case 'matiere':
            examen.matiere = value;
            break;
          case 'salle':
            examen.salle = value;
            break;
          case 'nombre surveillants':
            examen.nombre_surveillants = parseInt(value) || 1;
            break;
          case 'type requis':
            examen.type_requis = value;
            break;
        }
      });
      return examen;
    }).filter(e => e.date_examen && e.heure_debut && e.heure_fin && e.matiere && e.salle);

    const { error } = await supabase
      .from('examens')
      .insert(examens);

    if (error) throw error;

    return { processed: examens.length, type: 'examens' };
  };

  const processDisponibilites = async (headers: string[], rows: string[][], sessionId: string) => {
    const disponibilites = [];

    for (const row of rows) {
      const dispo: any = { session_id: sessionId };
      let email = "";
      
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : "";
        switch (header.toLowerCase()) {
          case 'email':
            email = value;
            break;
          case 'date':
            dispo.date_examen = value;
            break;
          case 'heure début':
          case 'heure debut':
            dispo.heure_debut = value;
            break;
          case 'heure fin':
            dispo.heure_fin = value;
            break;
          case 'disponible':
            dispo.est_disponible = value.toLowerCase() === 'oui' || value.toLowerCase() === 'true' || value === '1';
            break;
        }
      });

      if (email && dispo.date_examen && dispo.heure_debut && dispo.heure_fin) {
        const { data: surveillant } = await supabase
          .from('surveillants')
          .select('id')
          .eq('email', email)
          .single();

        if (surveillant) {
          dispo.surveillant_id = surveillant.id;
          disponibilites.push(dispo);
        }
      }
    }

    const { error } = await supabase
      .from('disponibilites')
      .insert(disponibilites);

    if (error) throw error;

    return { processed: disponibilites.length, type: 'disponibilités' };
  };

  const processIndisponibilites = async (headers: string[], rows: string[][], sessionId: string) => {
    const indisponibilites = [];

    for (const row of rows) {
      const indispo: any = { session_id: sessionId };
      let email = "";
      
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : "";
        switch (header.toLowerCase()) {
          case 'email':
            email = value;
            break;
          case 'date début':
          case 'date debut':
            indispo.date_debut = value;
            break;
          case 'date fin':
            indispo.date_fin = value;
            break;
          case 'motif':
            indispo.motif = value || null;
            break;
        }
      });

      if (email && indispo.date_debut && indispo.date_fin) {
        const { data: surveillant } = await supabase
          .from('surveillants')
          .select('id')
          .eq('email', email)
          .single();

        if (surveillant) {
          indispo.surveillant_id = surveillant.id;
          indisponibilites.push(indispo);
        }
      }
    }

    const { error } = await supabase
      .from('indisponibilites')
      .insert(indisponibilites);

    if (error) throw error;

    return { processed: indisponibilites.length, type: 'indisponibilités' };
  };

  const processQuotas = async (headers: string[], rows: string[][], sessionId: string) => {
    let updated = 0;

    for (const row of rows) {
      let email = "", quota = 0, sessionsImposees = 0;
      
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : "";
        switch (header.toLowerCase()) {
          case 'email':
            email = value;
            break;
          case 'quota':
            quota = parseInt(value) || 6;
            break;
          case 'sessions imposées':
          case 'sessions imposees':
            sessionsImposees = parseInt(value) || 0;
            break;
        }
      });

      if (email) {
        const { data: surveillant } = await supabase
          .from('surveillants')
          .select('id')
          .eq('email', email)
          .single();

        if (surveillant) {
          const { error } = await supabase
            .from('surveillant_sessions')
            .update({
              quota: quota,
              sessions_imposees: sessionsImposees
            })
            .eq('surveillant_id', surveillant.id)
            .eq('session_id', sessionId);

          if (!error) updated++;
        }
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

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Format non supporté",
        description: "Veuillez utiliser un fichier Excel (.xlsx ou .xls).",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      const data = await parseExcelFile(file);
      const result = await processData(data, fileType);
      
      if (result) {
        toast({
          title: "Import réussi",
          description: `${result.processed} ${result.type} importé(s) avec succès.`,
        });
        onUpload(true);
      }
      // Si result est null (cas des surveillants), la révision va s'ouvrir
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

  const handleReviewConfirm = async (approvedCandidates: SurveillantCandidate[]) => {
    try {
      const imported = await importApprovedSurveillants(approvedCandidates);
      
      toast({
        title: "Import terminé",
        description: `${imported} surveillant(s) importé(s) avec succès.`,
      });
      
      setShowReview(false);
      setCandidates([]);
      onUpload(true);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Erreur d'import",
        description: error.message || "Une erreur s'est produite lors de l'import.",
        variant: "destructive"
      });
    }
  };

  const handleReviewCancel = () => {
    setShowReview(false);
    setCandidates([]);
    setFileName("");
    onUpload(false);
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
    <>
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
                      Glissez votre fichier Excel ici ou
                    </p>
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={!activeSession}>
                        <span>Parcourir</span>
                      </Button>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        disabled={!activeSession}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Format : Excel (.xlsx, .xls) - Utilisez l'onglet "Données"
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
            <p className="text-xs text-gray-500 mt-2">
              💡 Utilisez d'abord les templates Excel pour vous assurer du bon format
            </p>
          </div>
        </CardContent>
      </Card>

      <SurveillantImportReview
        candidates={candidates}
        onConfirm={handleReviewConfirm}
        onCancel={handleReviewCancel}
        isOpen={showReview}
      />
    </>
  );
};
