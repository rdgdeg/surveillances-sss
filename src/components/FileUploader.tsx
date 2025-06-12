
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileUploaderProps {
  title: string;
  description: string;
  fileType: string;
  expectedFormat: string[];
  onUpload: (success: boolean) => void;
  uploaded: boolean;
}

export const FileUploader = ({ title, description, fileType, expectedFormat, onUpload, uploaded }: FileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const validateFile = (file: File): { valid: boolean; message: string } => {
    // Vérification de l'extension
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return { valid: false, message: "Le fichier doit être au format Excel (.xlsx ou .xls)" };
    }

    // Vérification de la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, message: "Le fichier ne doit pas dépasser 10MB" };
    }

    return { valid: true, message: "Fichier valide" };
  };

  const handleFileUpload = async (file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      toast({
        title: "Erreur de validation",
        description: validation.message,
        variant: "destructive"
      });
      onUpload(false);
      return;
    }

    setIsUploading(true);
    setFileName(file.name);

    try {
      // Simulation du traitement du fichier
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulation de la validation du contenu
      const contentValid = Math.random() > 0.1; // 90% de chance de succès
      
      if (contentValid) {
        toast({
          title: `${title} - Import réussi`,
          description: `Le fichier ${file.name} a été importé et validé avec succès.`,
        });
        onUpload(true);
      } else {
        toast({
          title: `${title} - Erreur de format`,
          description: "Le fichier ne respecte pas le format attendu. Vérifiez les colonnes requises.",
          variant: "destructive"
        });
        onUpload(false);
        setFileName("");
      }
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: "Une erreur s'est produite lors du traitement du fichier.",
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
        {!uploaded ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
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
                    <Button variant="outline" size="sm" asChild>
                      <span>Parcourir</span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Formats acceptés : .xlsx, .xls (max 10MB)
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

        {/* Format attendu */}
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
