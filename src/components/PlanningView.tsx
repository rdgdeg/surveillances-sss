
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Filter, Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

export const PlanningView = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: activeSession } = useActiveSession();

  // Charger les examens réels avec leurs attributions
  const { data: examens = [], isLoading } = useQuery({
    queryKey: ['examens-planning', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select(`
          *,
          attributions(
            id,
            surveillant_id,
            surveillants(nom, prenom, type)
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "complete": return "bg-green-100 text-green-800";
      case "partial": return "bg-orange-100 text-orange-800";
      case "pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatutText = (statut: string) => {
    switch (statut) {
      case "complete": return "Complet";
      case "partial": return "Partiel";
      case "pending": return "En attente";
      default: return "Inconnu";
    }
  };

  // Traitement des données pour le statut
  const examensAvecStatut = examens.map(examen => {
    const attributionsCount = examen.attributions?.length || 0;
    const surveillantsRequis = examen.surveillants_a_attribuer || 0;
    
    let statut = "pending";
    if (attributionsCount >= surveillantsRequis && surveillantsRequis > 0) {
      statut = "complete";
    } else if (attributionsCount > 0) {
      statut = "partial";
    }

    return {
      ...examen,
      statut,
      surveillantsAssignes: examen.attributions?.map(attr => 
        `${attr.surveillants?.prenom} ${attr.surveillants?.nom} (${attr.surveillants?.type})`
      ) || []
    };
  });

  const filteredExamens = examensAvecStatut.filter(examen => {
    const matchesSearch = examen.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         examen.salle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || examen.type_requis === filterType;
    const matchesDate = !selectedDate || examen.date_examen === selectedDate;
    
    return matchesSearch && matchesType && matchesDate;
  });

  const stats = {
    total: examensAvecStatut.length,
    complete: examensAvecStatut.filter(e => e.statut === "complete").length,
    partial: examensAvecStatut.filter(e => e.statut === "partial").length,
    pending: examensAvecStatut.filter(e => e.statut === "pending").length
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune session active</h3>
            <p className="text-gray-500">
              Veuillez activer une session pour consulter le planning des examens.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement du planning...</p>
          </div>
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

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Planning des Examens</span>
          </CardTitle>
          <CardDescription>
            Vue d'ensemble et gestion des attributions de surveillances
          </CardDescription>
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
                <SelectItem value="Enseignant">Enseignant</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>

          {/* Liste des examens */}
          <div className="space-y-4">
            {filteredExamens.map((examen) => (
              <div key={examen.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{formatDateWithDayBelgian(examen.date_examen)}</Badge>
                      <Badge variant="outline">{examen.heure_debut}-{examen.heure_fin}</Badge>
                      <Badge className={getStatutColor(examen.statut)}>
                        {getStatutText(examen.statut)}
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 text-lg">{examen.matiere}</h3>
                      <p className="text-gray-600">Salle : {examen.salle}</p>
                      <p className="text-sm text-gray-500">
                        Surveillants requis : {examen.surveillants_a_attribuer || 0} ({examen.type_requis} obligatoire)
                      </p>
                      {examen.enseignant_nom && (
                        <p className="text-sm text-gray-500">
                          Enseignant : {examen.enseignant_nom}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Surveillants assignés :</h4>
                      {examen.surveillantsAssignes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {examen.surveillantsAssignes.map((surveillant, index) => (
                            <Badge key={index} variant="secondary">
                              {surveillant}
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
            ))}
          </div>

          {filteredExamens.length === 0 && (
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
