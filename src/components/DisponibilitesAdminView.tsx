
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Grid3X3, 
  UserCheck, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Eye
} from "lucide-react";

export const DisponibilitesAdminView = () => {
  const { data: activeSession } = useActiveSession();

  // Récupérer les statistiques générales
  const { data: stats } = useQuery({
    queryKey: ['disponibilites-stats', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return null;

      // Statistiques des disponibilités
      const { data: disponibilites } = await supabase
        .from('disponibilites')
        .select('*, surveillants!inner(type)')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);

      // Statistiques des surveillants actifs
      const { data: surveillantsActifs } = await supabase
        .from('surveillant_sessions')
        .select('*, surveillants!inner(type)')
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      const totalDisponibilites = disponibilites?.length || 0;
      const obligatoires = disponibilites?.filter(d => d.type_choix === 'obligatoire').length || 0;
      const souhaites = disponibilites?.filter(d => d.type_choix === 'souhaitee').length || 0;
      const surveillantsAvecDispo = new Set(disponibilites?.map(d => d.surveillant_id) || []).size;
      const totalSurveillants = surveillantsActifs?.length || 0;
      const tauxReponse = totalSurveillants > 0 ? Math.round((surveillantsAvecDispo / totalSurveillants) * 100) : 0;

      // Jours avec examens
      const joursExamens = new Set(disponibilites?.map(d => d.date_examen) || []).size;

      return {
        totalDisponibilites,
        obligatoires,
        souhaites,
        surveillantsAvecDispo,
        totalSurveillants,
        tauxReponse,
        joursExamens
      };
    },
    enabled: !!activeSession?.id
  });

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir les disponibilités.
          </p>
        </CardContent>
      </Card>
    );
  }

  const navigationCards = [
    {
      title: "Vue par jour",
      description: "Consultez les disponibilités organisées par jour d'examen",
      icon: Calendar,
      link: "/admin/disponibilites/par-jour",
      color: "blue",
      stats: stats ? `${stats.joursExamens} jours avec examens` : "Chargement..."
    },
    {
      title: "Matrice créneaux",
      description: "Visualisez la matrice des disponibilités par surveillant et créneau",
      icon: Grid3X3,
      link: "/admin/disponibilites/matrice",
      color: "green",
      stats: stats ? `${stats.totalDisponibilites} disponibilités` : "Chargement..."
    },
    {
      title: "Vue par personne",
      description: "Suivi détaillé des disponibilités par surveillant",
      icon: UserCheck,
      link: "/admin/disponibilites/par-personne",
      color: "purple",
      stats: stats ? `${stats.surveillantsAvecDispo}/${stats.totalSurveillants} ont répondu` : "Chargement..."
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Vue d'ensemble des disponibilités</span>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - Tableau de bord et navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.totalDisponibilites || 0}
                  </div>
                  <div className="text-sm text-blue-700">Total disponibilités</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.souhaites || 0}
                  </div>
                  <div className="text-sm text-green-700">Disponibilités souhaitées</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.obligatoires || 0}
                  </div>
                  <div className="text-sm text-orange-700">Surveillances obligatoires</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.tauxReponse || 0}%
                  </div>
                  <div className="text-sm text-purple-700">Taux de réponse</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation vers les différentes vues */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Accès aux vues détaillées</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {navigationCards.map((card) => {
                const Icon = card.icon;
                const colorClasses = {
                  blue: "border-blue-200 hover:border-blue-300 hover:bg-blue-50",
                  green: "border-green-200 hover:border-green-300 hover:bg-green-50",
                  purple: "border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                };
                
                return (
                  <Link key={card.title} to={card.link}>
                    <Card className={`transition-all cursor-pointer ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <Icon className={`h-8 w-8 text-${card.color}-600`} />
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                        <h4 className="font-semibold mb-2">{card.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{card.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {card.stats}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Accès rapide aux demandes spécifiques */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Demandes spécifiques</h3>
            <Link to="/admin/demandes-specifiques">
              <Card className="border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                      <div>
                        <h4 className="font-semibold">Surveillances obligatoires</h4>
                        <p className="text-sm text-gray-600">
                          Gérez les demandes de surveillances obligatoires et leurs détails
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700">
                        {stats?.obligatoires || 0} demandes
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
