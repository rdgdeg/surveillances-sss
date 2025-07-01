import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Upload, 
  CheckCircle, 
  Users, 
  UserCheck, 
  AlertTriangle,
  ArrowRight,
  FileText,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Link } from "react-router-dom";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'in-progress' | 'pending' | 'error';
  progress: number;
  actionUrl?: string;
  actionLabel?: string;
}

export const AdminDashboardWorkflow = () => {
  const { data: activeSession } = useActiveSession();

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['workflow-status', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return null;

      // Récupérer les données pour évaluer le workflow
      const [examensResult, creneauxResult, disposResult, attributionsResult] = await Promise.all([
        supabase.from('examens').select('id, statut_validation').eq('session_id', activeSession.id),
        supabase.from('creneaux_surveillance_config').select('id, is_validated').eq('session_id', activeSession.id),
        supabase.from('disponibilites').select('surveillant_id').eq('session_id', activeSession.id),
        supabase.from('attributions').select('id').eq('session_id', activeSession.id)
      ]);

      const examens = examensResult.data || [];
      const creneaux = creneauxResult.data || [];
      const disposUniques = new Set((disposResult.data || []).map(d => d.surveillant_id));
      const attributions = attributionsResult.data || [];

      return {
        totalExamens: examens.length,
        examensValides: examens.filter(e => e.statut_validation === 'VALIDE').length,
        totalCreneaux: creneaux.length,
        creneauxValides: creneaux.filter(c => c.is_validated).length,
        surveillantsAvecDispos: disposUniques.size,
        totalAttributions: attributions.length
      };
    },
    enabled: !!activeSession?.id
  });

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune session active</h3>
            <p className="text-gray-500 mb-4">
              Vous devez d'abord créer et activer une session pour commencer.
            </p>
            <Button asChild>
              <Link to="/admin?tab=gestion-utilisateurs">Gérer les sessions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !workflowData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcul du statut de chaque étape
  const steps: WorkflowStep[] = [
    {
      id: 'import',
      title: 'Import & Configuration',
      description: 'Importer les examens et configurer les créneaux',
      status: workflowData.totalExamens > 0 ? 'complete' : 'pending',
      progress: workflowData.totalExamens > 0 ? 100 : 0,
      actionUrl: '/admin?tab=examens',
      actionLabel: 'Gérer les examens'
    },
    {
      id: 'validation',
      title: 'Validation des examens',
      description: 'Valider les examens importés',
      status: workflowData.examensValides === workflowData.totalExamens && workflowData.totalExamens > 0 
        ? 'complete' 
        : workflowData.examensValides > 0 ? 'in-progress' : 'pending',
      progress: workflowData.totalExamens > 0 ? (workflowData.examensValides / workflowData.totalExamens) * 100 : 0,
      actionUrl: '/admin?tab=planning',
      actionLabel: 'Valider les examens'
    },
    {
      id: 'creneaux',
      title: 'Créneaux de surveillance',
      description: 'Configurer et valider les créneaux',
      status: workflowData.creneauxValides > 0 ? 'complete' : 'pending',
      progress: workflowData.totalCreneaux > 0 ? (workflowData.creneauxValides / workflowData.totalCreneaux) * 100 : 0,
      actionUrl: '/admin?tab=controles-verifications',
      actionLabel: 'Configurer les créneaux'
    },
    {
      id: 'disponibilites',
      title: 'Collecte des disponibilités',
      description: 'Collecter les disponibilités des surveillants',
      status: workflowData.surveillantsAvecDispos > 0 ? 'in-progress' : 'pending',
      progress: workflowData.surveillantsAvecDispos > 0 ? 50 : 0, // Approximation
      actionUrl: '/admin/disponibilites',
      actionLabel: 'Gérer les disponibilités'
    },
    {
      id: 'attributions',
      title: 'Attributions',
      description: 'Attribuer les surveillants aux examens',
      status: workflowData.totalAttributions > 0 ? 'in-progress' : 'pending',
      progress: workflowData.totalAttributions > 0 ? 30 : 0, // Approximation
      actionUrl: '/admin?tab=pre-assignations',
      actionLabel: 'Gérer les attributions'
    }
  ];

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress': return <ArrowRight className="h-5 w-5 text-blue-600" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (step: WorkflowStep) => {
    switch (step.status) {
      case 'complete': return 'border-green-200 bg-green-50';
      case 'in-progress': return 'border-blue-200 bg-blue-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200';
    }
  };

  // Prochaine action recommandée
  const nextStep = steps.find(s => s.status === 'pending' || s.status === 'in-progress');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Workflow de la Session: {activeSession.name}</span>
          </CardTitle>
          <CardDescription>
            Suivi du processus de gestion des surveillances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={step.id} className={`${getStepColor(step)} transition-colors`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        {getStepIcon(step)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.progress > 0 && (
                          <div className="mt-2">
                            <Progress value={step.progress} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.round(step.progress)}% complété
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {step.actionUrl && (
                      <Button 
                        variant={step.status === 'pending' ? 'default' : 'outline'} 
                        size="sm"
                        asChild
                      >
                        <Link to={step.actionUrl}>
                          {step.actionLabel}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action recommandée */}
      {nextStep && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Prochaine étape recommandée</h3>
                <p className="text-sm text-blue-700">{nextStep.description}</p>
              </div>
              {nextStep.actionUrl && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to={nextStep.actionUrl}>
                    {nextStep.actionLabel}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};