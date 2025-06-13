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

export const NewPlanningView = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: activeSession } = useActiveSession();

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
          )
        `)
        .eq('session_id', activeSession.id)
        .order('date_examen')
        .order('heure_debut');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession
  });

  const getStatutColor = (examen: any) => {
    const assignedCount = examen.attributions?.length || 0;
    const requiredCount = examen.nombre_surveillants;
    
    if (assignedCount === 0) return "bg-red-100 text-red-800";
    if (assignedCount < requiredCount) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getStatutText = (examen: any) => {
    const assignedCount = examen.attributions?.length || 0;
    const requiredCount = examen.nombre_surveillants;
    
    if (assignedCount === 0) return "En attente";
    if (assignedCount < requiredCount) return "Partiel";
    return "Complet";
  };

  const filteredExamens = examens.filter(examen => {
    const matchesSearch = examen.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         examen.salle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || examen.type_requis === filterType;
    const matchesDate = !selectedDate || examen.date_examen === selectedDate;
    
    return matchesSearch && matchesType && matchesDate;
  });

  const stats = {
    total: examens.length,
    complete: examens.filter(e => (e.attributions?.length || 0) === e.nombre_surveillants).length,
    partial: examens.filter(e => {
      const assigned = e.attributions?.length || 0;
      return assigned > 0 && assigned < e.nombre_surveillants;
    }).length,
    pending: examens.filter(e => (e.attributions?.length || 0) === 0).length
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

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Planning des Examens - {activeSession.name}</span>
              </CardTitle>
              <CardDescription>
                Vue d'ensemble et gestion des attributions de surveillances
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

          {/* Liste des examens */}
          <div className="space-y-4">
            {filteredExamens.map((examen) => (
              <div key={examen.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">{examen.date_examen}</Badge>
                      <Badge variant="outline">{examen.heure_debut} - {examen.heure_fin}</Badge>
                      <Badge className={getStatutColor(examen)}>
                        {getStatutText(examen)}
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 text-lg">{examen.matiere}</h3>
                      <p className="text-gray-600">Salle : {examen.salle}</p>
                      <p className="text-sm text-gray-500">
                        Surveillants requis : {examen.nombre_surveillants} ({examen.type_requis} obligatoire)
                      </p>
                    </div>

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
