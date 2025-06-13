
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, AlertTriangle, CheckCircle, TrendingUp, Calculator } from "lucide-react";

interface DashboardStats {
  totalSurveillantsRequis: number;
  capaciteTheorique: number;
  tauxCouverture: number;
  examensTotal: number;
  examensComplets: number;
  progressionAttributions: number;
  surveillantsActifs: number;
  sessionActive: string;
}

export const DashboardOverview = () => {
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
        .select('surveillants_a_attribuer')
        .eq('session_id', activeSession.id);

      const totalSurveillantsRequis = examens?.reduce((sum, exam) => 
        sum + (exam.surveillants_a_attribuer || 0), 0) || 0;

      // Get theoretical capacity from quotas
      const { data: quotas } = await supabase
        .from('surveillant_sessions')
        .select('quota')
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      const capaciteTheorique = quotas?.reduce((sum, q) => sum + q.quota, 0) || 0;

      // Get exam completion stats
      const { data: examensStats } = await supabase
        .from('examens')
        .select('id, surveillants_a_attribuer')
        .eq('session_id', activeSession.id);

      const examensTotal = examensStats?.length || 0;

      // Count exams with enough attributions
      const { data: attributions } = await supabase
        .from('attributions')
        .select('examen_id')
        .eq('session_id', activeSession.id);

      const attributionsByExam = attributions?.reduce((acc, attr) => {
        acc[attr.examen_id] = (acc[attr.examen_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const examensComplets = examensStats?.filter(exam => 
        (attributionsByExam[exam.id] || 0) >= (exam.surveillants_a_attribuer || 0)
      ).length || 0;

      // Count active surveillants
      const { data: surveillantsActifs } = await supabase
        .from('surveillant_sessions')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      return {
        totalSurveillantsRequis,
        capaciteTheorique,
        tauxCouverture: capaciteTheorique > 0 ? (totalSurveillantsRequis / capaciteTheorique) * 100 : 0,
        examensTotal,
        examensComplets,
        progressionAttributions: examensTotal > 0 ? (examensComplets / examensTotal) * 100 : 0,
        surveillantsActifs: surveillantsActifs?.length || 0,
        sessionActive: activeSession.name
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
              Surveillants Requis
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
              Capacité Théorique
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.capaciteTheorique}</div>
            <p className="text-xs text-muted-foreground">
              Basé sur les quotas ({stats.surveillantsActifs} surveillants)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de Couverture
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(stats.tauxCouverture)}`}>
              {stats.tauxCouverture.toFixed(1)}%
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(stats.tauxCouverture)}
            </div>
          </CardContent>
        </Card>

        <Card>
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

      {/* Détails et alertes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progression des Attributions</CardTitle>
            <CardDescription>
              Pourcentage d'examens avec tous les surveillants attribués
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={stats.progressionAttributions} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{stats.examensComplets} complets</span>
                <span>{stats.examensTotal - stats.examensComplets} restants</span>
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
              {stats.tauxCouverture >= 100 && stats.progressionAttributions >= 80 && (
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
