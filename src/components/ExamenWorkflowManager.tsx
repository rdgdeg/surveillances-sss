
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, MapPin, ClipboardList, FileText } from "lucide-react";
import { StandardExcelImporter } from "./StandardExcelImporter";
import { AuditoireValidationManager } from "./AuditoireValidationManager";
import { ExamenConsolidatedView } from "./ExamenConsolidatedView";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

export const ExamenWorkflowManager = () => {
  const [activeTab, setActiveTab] = useState("import");
  const { data: activeSession } = useActiveSession();

  // Vérifier le statut du workflow
  const { data: workflowStatus } = useQuery({
    queryKey: ['workflow-status', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return null;

      // Compter les examens par statut
      const { data: examens, error } = await supabase
        .from('examens')
        .select('statut_validation, salle')
        .eq('session_id', activeSession.id);

      if (error) throw error;

      // Récupérer les contraintes d'auditoires
      const { data: contraintes, error: contraintesError } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire');

      if (contraintesError) throw contraintesError;

      const contraintesSet = new Set(contraintes.map(c => c.auditoire.toLowerCase()));
      
      const stats = {
        totalExamens: examens.length,
        examensValides: examens.filter(e => e.statut_validation === 'VALIDE').length,
        examensNonTraites: examens.filter(e => e.statut_validation === 'NON_TRAITE').length,
        auditoiresNonReconnus: examens.filter(e => 
          !contraintesSet.has(e.salle.toLowerCase())
        ).length
      };

      return stats;
    },
    enabled: !!activeSession?.id,
    refetchInterval: 5000 // Actualiser toutes les 5 secondes
  });

  const getStepStatus = (step: string) => {
    if (!workflowStatus) return 'pending';
    
    switch (step) {
      case 'import':
        return workflowStatus.totalExamens > 0 ? 'complete' : 'pending';
      case 'auditoires':
        return workflowStatus.auditoiresNonReconnus === 0 ? 'complete' : 
               workflowStatus.totalExamens > 0 ? 'warning' : 'pending';
      case 'validation':
        return workflowStatus.examensValides === workflowStatus.totalExamens ? 'complete' :
               workflowStatus.auditoiresNonReconnus === 0 ? 'ready' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'ready':
        return <ClipboardList className="h-4 w-4 text-blue-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800">Action requise</Badge>;
      case 'ready':
        return <Badge className="bg-blue-100 text-blue-800">Prêt</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span>Workflow de Gestion des Examens</span>
          </CardTitle>
          <CardDescription>
            Processus complet d'import, validation et configuration des examens
          </CardDescription>
          
          {workflowStatus && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="font-bold text-gray-600">{workflowStatus.totalExamens}</div>
                <div className="text-gray-800 text-sm">Examens importés</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="font-bold text-orange-600">{workflowStatus.auditoiresNonReconnus}</div>
                <div className="text-orange-800 text-sm">Auditoires à corriger</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="font-bold text-green-600">{workflowStatus.examensValides}</div>
                <div className="text-green-800 text-sm">Examens validés</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="font-bold text-blue-600">
                  {workflowStatus.totalExamens - workflowStatus.examensValides}
                </div>
                <div className="text-blue-800 text-sm">Restant à valider</div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            {getStepIcon(getStepStatus('import'))}
            <span>1. Import</span>
            {getStepBadge(getStepStatus('import'))}
          </TabsTrigger>
          <TabsTrigger value="auditoires" className="flex items-center space-x-2">
            {getStepIcon(getStepStatus('auditoires'))}
            <span>2. Auditoires</span>
            {getStepBadge(getStepStatus('auditoires'))}
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2">
            {getStepIcon(getStepStatus('validation'))}
            <span>3. Validation</span>
            {getStepBadge(getStepStatus('validation'))}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <StandardExcelImporter />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Étape 1 : Import des examens</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Importez le fichier Excel standardisé fourni par le secrétariat</li>
                  <li>Vérification automatique du format des dates (jour mois année)</li>
                  <li>Extraction automatique des codes d'examens</li>
                  <li>Séparation automatique des auditoires multiples</li>
                  <li>Classification automatique des types d'examens</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoires" className="space-y-4">
          <AuditoireValidationManager />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Étape 2 : Validation des auditoires</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Vérification que tous les auditoires sont reconnus dans le système</li>
                  <li>Correction manuelle des auditoires non reconnus</li>
                  <li>Mapping vers des auditoires existants ou création de nouveaux</li>
                  <li>Configuration automatique des contraintes de surveillance</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <ExamenConsolidatedView />
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">Étape 3 : Vue consolidée et validation finale</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Vue groupée par examen avec tous les auditoires sur une ligne</li>
                  <li>Contrôle du nombre total de surveillants requis</li>
                  <li>Validation en lot des examens consolidés</li>
                  <li>Statistiques complètes sur les examens et besoins</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
