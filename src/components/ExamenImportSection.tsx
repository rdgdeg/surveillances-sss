import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewFileUploader } from "@/components/NewFileUploader";
import { TemplateDownloader } from "@/components/TemplateDownloader";
import { ExamenCodeUploader } from "@/components/ExamenCodeUploader";

export const ExamenImportSection = () => {
  const [uploadsState, setUploadsState] = useState({
    examens: false,
    surveillants: false,
    indisponibilites: false,
    quotas: false
  });

  const handleUploadSuccess = (fileType: string, success: boolean) => {
    setUploadsState(prev => ({
      ...prev,
      [fileType]: success
    }));
  };

  // NOTE: NewFileUploader ne prend pas de props title, description, etc.
  // Donc on n'utilise que NewFileUploader standard ici (exemple générique, un par le design d'origine)
  // Le mapping en grid attend des NewFileUploader personnalisables, mais ce n'est pas supporté, donc fallback unique.
  // Si besoin d'uploader spécifique, créer un composant sur mesure pour chaque type.

  return (
    <div className="space-y-6">
      <ExamenCodeUploader />
      
      <Card className="border-uclouvain-blue-grey">
        <CardHeader className="bg-gradient-uclouvain text-white">
          <CardTitle>Templates de Fichiers</CardTitle>
          <CardDescription className="text-blue-100">
            Téléchargez les templates pour préparer vos fichiers d'import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateDownloader />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NewFileUploader />
        {/* À dupliquer ou spécialiser plus tard si besoin de gestion multi-type */}
      </div>

      <Card className="border-uclouvain-blue-grey">
        <CardHeader>
          <CardTitle className="text-uclouvain-blue">Informations importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-blue-50 border border-uclouvain-cyan rounded-lg">
            <h4 className="font-medium text-uclouvain-blue mb-2">Nouveau : Gestion des facultés</h4>
            <ul className="text-sm text-uclouvain-blue space-y-1">
              <li>• Les examens incluent maintenant le champ <code className="bg-white px-1 rounded">faculte</code></li>
              <li>• Les surveillants peuvent avoir une <code className="bg-white px-1 rounded">faculte_interdite</code></li>
              <li>• L'attribution respectera automatiquement ces contraintes</li>
            </ul>
          </div>
          
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">Données sensibles (Surveillants)</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Les surveillants FSM sont automatiquement exclus</li>
              <li>• Les contrats expirés sont filtrés automatiquement</li>
              <li>• L'EFT ajuste automatiquement les quotas par défaut</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Format des fichiers</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Format CSV avec séparateur point-virgule (;)</li>
              <li>• Première ligne = en-têtes de colonnes</li>
              <li>• Encodage UTF-8 recommandé</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
