import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { DeleteAllExamensButton } from "@/components/DeleteAllExamensButton";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { useCalculSurveillants } from "@/hooks/useCalculSurveillants";

export const NewPlanningView = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: activeSession } = useActiveSession();
  const { 
    calculerSurveillantsTheorique,
    calculerSurveillantsNecessaires,
    calculerSurveillantsPedagogiques
  } = useCalculSurveillants();

  const { data: examens = [], isLoading } = useQuery({
    queryKey: ['examens', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select(`
          *,
          attributions (
            id,
            surveillants (nom, prenom, type)
          ),
          personnes_aidantes (*)
        `)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession
  });

  // Enrichir les examens avec les calculs centralisés
  const examensEnrichis = examens.map(examen => {
    const surveillantsTheorique = calculerSurveillantsTheorique(examen);
    const surveillantsPedagogiques = calculerSurveillantsPedagogiques(examen);
    const surveillantsNecessaires = calculerSurveillantsNecessaires(examen);
    
    return {
      ...examen,
      nombre_surveillants_calcule: surveillantsTheorique,
      surveillants_pedagogiques: surveillantsPedagogiques,
      surveillants_necessaires: surveillantsNecessaires
    };
  });

  // Fonction pour trier les examens par date puis par heure
  const sortExamens = (examens: any[]) => {
    return [...examens].sort((a, b) => {
      // Trier d'abord par date
      const dateA = new Date(a.date_examen);
      const dateB = new Date(b.date_examen);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Si même date, trier par heure de début
      const timeA = a.heure_debut || '00:00';
      const timeB = b.heure_debut || '00:00';
      
      return timeA.localeCompare(timeB);
    });
  };

  const getStatutColor = (examen: any) => {
    const assignedCount = examen.attributions?.length || 0;
    const requiredCount = examen.surveillants_necessaires;
    
    if (assignedCount === 0) return "bg-red-100 text-red-800";
    if (assignedCount < requiredCount) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getStatutText = (examen: any) => {
    const assignedCount = examen.attributions?.length || 0;
    const requiredCount = examen.surveillants_necessaires;
    
    if (assignedCount === 0) return "En attente";
    if (assignedCount < requiredCount) return "Partiel";
    return "Complet";
  };

  const filteredExamens = examensEnrichis.filter(examen => {
    const matchesSearch = examen.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         examen.salle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || examen.type_requis === filterType;
    const matchesDate = !selectedDate || examen.date_examen === selectedDate;
    
    return matchesSearch && matchesType && matchesDate;
  });

  // Appliquer le tri après filtrage
  const sortedExamens = sortExamens(filteredExamens);

  const stats = {
    total: examens.length,
    complete: examensEnrichis.filter(e => (e.attributions?.length || 0) === e.surveillants_necessaires).length,
    partial: examensEnrichis.filter(e => {
      const assigned = e.attributions?.length || 0;
      return assigned > 0 && assigned < e.surveillants_necessaires;
    }).length,
    pending: examensEnrichis.filter(e => (e.attributions?.length || 0) === 0).length
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune session active. Veuillez d'abord activer une session.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Chargement du planning...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total examens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.complete}</p>
                <p className="text-sm text-gray-600">Complets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.partial}</p>
                <p className="text-sm text-gray-600">Partiels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
                <p className="text-sm text-gray-600">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche + Liste des examens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Planning des Examens - {activeSession.name}</span>
              </CardTitle>
              <CardDescription>
                Vue d'ensemble et gestion des attributions de surveillances (calculs centralisés)
              </CardDescription>
            </div>
            <DeleteAllExamensButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Rechercher par matière ou salle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="PAT">PAT</SelectItem>
                <SelectItem value="Assistant">Assistant</SelectItem>
                <SelectItem value="Jobiste">Jobiste</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>

          {/* Liste des examens avec calculs centralisés */}
          <div className="space-y-4">
            {sortedExamens.map((examen) => {
              const profApportes = (examen.surveillants_enseignant || 0) + (examen.surveillants_amenes || 0);
              
              return (
                <div key={examen.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="font-semibold">
                          {formatDateWithDayBelgian(examen.date_examen)}
                        </Badge>
                        <Badge variant="outline">{examen.heure_debut} - {examen.heure_fin}</Badge>
                        <Badge className={getStatutColor(examen)}>
                          {getStatutText(examen)}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900 text-lg">{examen.matiere}</h3>
                        <p className="text-gray-600">Salle : {examen.salle}</p>
                        <p className="text-sm text-gray-500">
                          <strong>Surveillants théoriques (auditoires) : {examen.nombre_surveillants_calcule}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                          Enseignant présent : {examen.surveillants_enseignant || 0}
                        </p>
                        <p className="text-sm text-gray-500">
                          Surveillants amenés : {examen.surveillants_amenes || 0}
                        </p>
                        <p className="text-sm text-gray-500">
                          Pré-assignés : {examen.surveillants_pre_assignes || 0}
                        </p>
                        <p className="text-sm text-gray-500 font-medium text-blue-600">
                          <strong>À attribuer (besoin réel) : {examen.surveillants_necessaires} ({examen.type_requis} obligatoire)</strong>
                        </p>
                        <p className="text-xs text-gray-400">
                          Calcul centralisé: {examen.nombre_surveillants_calcule} - {examen.surveillants_enseignant || 0} - {examen.surveillants_amenes || 0} - {examen.surveillants_pre_assignes || 0} = {examen.surveillants_necessaires}
                        </p>
                      </div>

                      {/* Liste des surveillants assignés */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Surveillants assignés :</h4>
                        {examen.attributions && examen.attributions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {examen.attributions.map((attribution: any, index: number) => (
                              <Badge key={index} variant="secondary">
                                {attribution.surveillants.prenom} {attribution.surveillants.nom} ({attribution.surveillants.type})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Aucun surveillant assigné</p>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Gérer
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedExamens.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun examen trouvé avec les critères sélectionnés</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
