
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewFileUploader } from "@/components/NewFileUploader";
import { TemplateDownloader } from "@/components/TemplateDownloader";

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

  const fileConfigs = [
    {
      fileType: 'examens' as const,
      title: "Import Examens",
      description: "Fichier des examens avec facultés et auditoires",
      expectedFormat: [
        'date_examen', 
        'heure_debut', 
        'heure_fin', 
        'matiere', 
        'salle', 
        'nombre_surveillants', 
        'type_requis', 
        'faculte',
        'auditoire_original'
      ]
    },
    {
      fileType: 'surveillants' as const,
      title: "Import Surveillants",
      description: "Liste des surveillants avec données sensibles",
      expectedFormat: [
        'nom', 
        'prenom', 
        'email', 
        'type', 
        'faculte_interdite', 
        'eft', 
        'affectation_fac', 
        'date_fin_contrat', 
        'telephone_gsm', 
        'campus'
      ]
    },
    {
      fileType: 'indisponibilites' as const,
      title: "Import Indisponibilités",
      description: "Périodes d'indisponibilité des surveillants",
      expectedFormat: ['email_surveillant', 'date_debut', 'date_fin', 'motif']
    },
    {
      fileType: 'quotas' as const,
      title: "Ajustement Quotas",
      description: "Modification des quotas individuels",
      expectedFormat: ['email_surveillant', 'quota', 'sessions_imposees']
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Templates de Fichiers</CardTitle>
          <CardDescription>
            Téléchargez les templates pour préparer vos fichiers d'import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateDownloader />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fileConfigs.map((config) => (
          <NewFileUploader
            key={config.fileType}
            title={config.title}
            description={config.description}
            fileType={config.fileType}
            expectedFormat={config.expectedFormat}
            onUpload={(success) => handleUploadSuccess(config.fileType, success)}
            uploaded={uploadsState[config.fileType]}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Nouveau : Gestion des facultés</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Les examens incluent maintenant le champ <code>faculte</code></li>
              <li>• Les surveillants peuvent avoir une <code>faculte_interdite</code></li>
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
