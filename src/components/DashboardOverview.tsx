
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, AlertTriangle, CheckCircle, TrendingUp, Calculator, UserCheck, FileText, Briefcase } from "lucide-react";
import { ExamensCompletsModal } from "./ExamensCompletsModal";
import { useState } from "react";

interface DashboardStats {
  totalSurveillantsRequis: number;
  capaciteTheorique: number;
  tauxCouverture: number;
  examensTotal: number;
  examensComplets: number;
  progressionAttributions: number;
  surveillantsActifs: number;
  sessionActive: string;
  surveillancesJobistes: number;
  surveillantsParType: { [key: string]: number };
  disposRemplies: number;
  totalSurveillants: number;
  renseignementsEnseignants: number;
  totalExamensValides: number;
}

export const DashboardOverview = () => {
  const [examensCompletsOpen, setExamensCompletsOpen] = useState(false);
  const [examensCompletsList, setExamensCompletsList] = useState<any[]>([]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Get active session
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('is_active', true)
        .single();

      if (!activeSession) {
        throw new Error('Aucune session active trouvée');
      }

      // Get total surveillants required
      const { data: examens } = await supabase
        .from('examens')
        .select('id, matiere, date_examen, heure_debut, heure_fin, salle, surveillants_a_attribuer, besoins_confirmes_par_enseignant, statut_validation')
        .eq('session_id', activeSession.id);

      const totalSurveillantsRequis = examens?.reduce((sum, exam) =>
        sum + (exam.surveillants_a_attribuer || 0), 0) || 0;

      // Get attributions for all examens
      const { data: attributions } = await supabase
        .from('attributions')
        .select('examen_id, surveillant_id')
        .eq('session_id', activeSession.id);

      // Compte examens complets (attributions >= surveillants requis)
      const attributionsByExam = attributions?.reduce((acc, attr) => {
        acc[attr.examen_id] = (acc[attr.examen_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get surveillances by jobistes
      const { data: surveillantsInfo } = await supabase
        .from('surveillants')
        .select('id, type')
        .in('id', attributions?.map(a => a.surveillant_id) || []);

      const surveillancesJobistes = attributions?.filter(attr => {
        const surveillant = surveillantsInfo?.find(s => s.id === attr.surveillant_id);
        return surveillant?.type === 'Jobiste';
      }).length || 0;

      // Correction couverture/théorique (coverage = capacité/needs*100)
      const { data: quotas } = await supabase
        .from('surveillant_sessions')
        .select('quota')
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      const capaciteTheorique = quotas?.reduce((sum, q) => sum + q.quota, 0) || 0;

      // Correction du taux de couverture (coverage = capaciteTheorique / totalSurveillantsRequis * 100)
      const tauxCouverture = totalSurveillantsRequis > 0
        ? (capaciteTheorique / totalSurveillantsRequis) * 100
        : 0;

      // Pourcentage examens complets + la liste détaillée
      const examensComplets = (examens || []).filter(exam =>
        (attributionsByExam[exam.id] || 0) >= (exam.surveillants_a_attribuer || 0)
        && (exam.surveillants_a_attribuer || 0) > 0
      ).map(exam => ({
        ...exam,
        attributions_count: attributionsByExam[exam.id] || 0
      }));

      const examensTotal = examens?.length || 0;

      // Progression attributions
      const progressionAttributions = examensTotal > 0 ? (examensComplets.length / examensTotal) * 100 : 0;

      const { data: surveillantsActifs } = await supabase
        .from('surveillant_sessions')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      // Nouveaux stats demandés
      
      // Nombre de surveillants par type
      const { data: allSurveillants } = await supabase
        .from('surveillants')
        .select('type')
        .in('id', surveillantsActifs?.map(s => s.surveillant_id) || []);

      const surveillantsParType = allSurveillants?.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Nombre de dispos remplies
      const { data: disposUniques } = await supabase
        .from('disponibilites')
        .select('surveillant_id')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);

      const surveillantsAvecDispos = new Set(disposUniques?.map(d => d.surveillant_id) || []);
      const disposRemplies = surveillantsAvecDispos.size;
      const totalSurveillants = surveillantsActifs?.length || 0;

      // Renseignements enseignants
      const examensValides = examens?.filter(e => e.statut_validation === 'VALIDE') || [];
      const renseignementsEnseignants = examensValides.filter(e => e.besoins_confirmes_par_enseignant).length;
      const totalExamensValides = examensValides.length;

      return {
        totalSurveillantsRequis,
        capaciteTheorique,
        tauxCouverture,
        examensTotal,
        examensComplets: examensComplets.length,
        progressionAttributions,
        surveillantsActifs: totalSurveillants,
        sessionActive: activeSession.name,
        examensCompletsList: examensComplets,
        surveillancesJobistes,
        surveillantsParType,
        disposRemplies,
        totalSurveillants,
        renseignementsEnseignants,
        totalExamensValides
      };
    }
  });

  // Pour ouvrir la modal examens complets
  const handleOpenExamensComplets = () => {
    if (stats?.examensCompletsList) setExamensCompletsList(stats.examensCompletsList);
    setExamensCompletsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucune session active trouvée. Veuillez créer et activer une session.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) return <Badge variant="default" className="bg-green-100 text-green-800">Complet</Badge>;
    if (percentage >= 80) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En cours</Badge>;
    return <Badge variant="destructive">Critique</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Examens Complets Modal */}
      <ExamensCompletsModal
        open={examensCompletsOpen}
        onOpenChange={setExamensCompletsOpen}
        examens={examensCompletsList}
      />

      {/* Session active */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Session Active: {stats.sessionActive}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Surveillants à Trouver
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSurveillantsRequis}</div>
            <p className="text-xs text-muted-foreground">
              Total pour tous les examens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Nombre d'Examens
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.examensTotal}</div>
            <p className="text-xs text-muted-foreground">
              Examens dans la session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Surveillances Jobistes
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.surveillancesJobistes}</div>
            <p className="text-xs text-muted-foreground">
              Assurées par des jobistes
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/30 transition"
          onClick={handleOpenExamensComplets}
          title="Voir la liste des examens complets"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Examens Complets
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.examensComplets}/{stats.examensTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.progressionAttributions.toFixed(1)}% des examens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Nouvelles statistiques détaillées */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Surveillants par Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.surveillantsParType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{type}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <UserCheck className="h-4 w-4" />
              <span>Disponibilités Remplies</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {stats.disposRemplies}/{stats.totalSurveillants}
              </div>
              <Progress 
                value={(stats.disposRemplies / (stats.totalSurveillants || 1)) * 100} 
                className="w-full" 
              />
              <p className="text-xs text-muted-foreground">
                {((stats.disposRemplies / (stats.totalSurveillants || 1)) * 100).toFixed(1)}% de completion
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Renseignements Enseignants</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {stats.renseignementsEnseignants}/{stats.totalExamensValides}
              </div>
              <Progress 
                value={(stats.renseignementsEnseignants / (stats.totalExamensValides || 1)) * 100} 
                className="w-full" 
              />
              <p className="text-xs text-muted-foreground">
                {((stats.renseignementsEnseignants / (stats.totalExamensValides || 1)) * 100).toFixed(1)}% confirmés
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails et alertes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capacité Théorique</CardTitle>
            <CardDescription>
              Basé sur les quotas des surveillants actifs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{stats.capaciteTheorique}</div>
              <div className={`text-lg font-semibold ${getStatusColor(stats.tauxCouverture)}`}>
                Taux de couverture: {stats.tauxCouverture.toFixed(1)}%
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(stats.tauxCouverture)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alertes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.tauxCouverture < 100 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Capacité insuffisante:</strong> Il manque {stats.totalSurveillantsRequis - stats.capaciteTheorique} surveillances pour couvrir tous les besoins.
                  </p>
                </div>
              )}
              {stats.progressionAttributions < 50 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Attributions en retard:</strong> Moins de 50% des examens ont tous leurs surveillants.
                  </p>
                </div>
              )}
              {stats.disposRemplies / stats.totalSurveillants < 0.8 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Disponibilités manquantes:</strong> Moins de 80% des surveillants ont rempli leurs disponibilités.
                  </p>
                </div>
              )}
              {stats.tauxCouverture >= 100 && stats.progressionAttributions >= 80 && stats.disposRemplies / stats.totalSurveillants >= 0.8 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Situation normale:</strong> La capacité est suffisante et les attributions avancent bien.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
