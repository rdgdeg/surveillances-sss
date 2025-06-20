
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveSession } from "@/hooks/useSessions";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Download, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { SurveillantDisponibilite } from "./SuiviDisponibilites";
import { DisponibilitesAdminView } from "./DisponibilitesAdminView";
import * as XLSX from 'xlsx';

export const SuiviDisponibilitesAdmin = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("tous");
  const [sortBy, setSortBy] = useState<string>("completion_desc");

  // Récupérer tous les créneaux d'examens pour cette session
  const { data: totalCreneaux = 0 } = useQuery({
    queryKey: ['total-creneaux', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return 0;
      
      const { data, error } = await supabase
        .from('examens')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE');
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les surveillants avec leurs disponibilités ET pré-attributions
  const { data: surveillantsData = [], isLoading } = useQuery({
    queryKey: ['surveillants-disponibilites', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      // Récupérer les surveillants actifs
      const { data: surveillants, error: surveillantsError } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillants (
            id, nom, prenom, email, type, affectation_fac
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);
      
      if (surveillantsError) throw surveillantsError;

      // Pour chaque surveillant, compter ses disponibilités et pré-attributions
      const surveillantsAvecStats = await Promise.all(
        (surveillants || []).map(async (item) => {
          const surveillant = item.surveillants;
          if (!surveillant) return null;

          // Compter les disponibilités renseignées
          const { count: disponibilitesCount } = await supabase
            .from('disponibilites')
            .select('*', { count: 'exact', head: true })
            .eq('surveillant_id', surveillant.id)
            .eq('session_id', activeSession.id)
            .eq('est_disponible', true);

          // Compter les pré-attributions
          const { count: preAttributionsCount } = await supabase
            .from('attributions')
            .select('*', { count: 'exact', head: true })
            .eq('surveillant_id', surveillant.id)
            .eq('session_id', activeSession.id)
            .eq('is_pre_assigne', true);

          // Récupérer la dernière réponse
          const { data: derniereReponse } = await supabase
            .from('disponibilites')
            .select('created_at')
            .eq('surveillant_id', surveillant.id)
            .eq('session_id', activeSession.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const totalReponses = (disponibilitesCount || 0) + (preAttributionsCount || 0);
          const pourcentageCompletion = totalCreneaux > 0 ? Math.round((totalReponses / totalCreneaux) * 100) : 0;

          return {
            id: surveillant.id,
            nom: surveillant.nom,
            prenom: surveillant.prenom,
            email: surveillant.email,
            type: surveillant.type,
            faculte: surveillant.affectation_fac || 'Non spécifiée',
            creneaux_repondus: totalReponses,
            total_creneaux: totalCreneaux,
            pourcentage_completion: pourcentageCompletion,
            derniere_reponse: derniereReponse?.[0]?.created_at || null
          } as SurveillantDisponibilite;
        })
      );

      return surveillantsAvecStats.filter(Boolean) as SurveillantDisponibilite[];
    },
    enabled: !!activeSession?.id && totalCreneaux > 0
  });

  // Filtrage par terme de recherche
  const surveillantsFiltres = surveillantsData.filter(surveillant => {
    const searchMatch = !searchTerm || 
      surveillant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.email.toLowerCase().includes(searchTerm.toLowerCase());

    const typeMatch = filterType === "tous" || surveillant.type === filterType;

    return searchMatch && typeMatch;
  });

  // Tri des surveillants
  const surveillantsTries = [...surveillantsFiltres].sort((a, b) => {
    switch (sortBy) {
      case "completion_desc":
        return b.pourcentage_completion - a.pourcentage_completion;
      case "completion_asc":
        return a.pourcentage_completion - b.pourcentage_completion;
      case "nom":
        return a.nom.localeCompare(b.nom);
      case "derniere_reponse":
        if (!a.derniere_reponse && !b.derniere_reponse) return 0;
        if (!a.derniere_reponse) return 1;
        if (!b.derniere_reponse) return -1;
        return new Date(b.derniere_reponse).getTime() - new Date(a.derniere_reponse).getTime();
      default:
        return 0;
    }
  });

  // Statistiques globales
  const stats = {
    total: surveillantsData.length,
    complets: surveillantsData.filter(s => s.pourcentage_completion === 100).length,
    partiels: surveillantsData.filter(s => s.pourcentage_completion > 0 && s.pourcentage_completion < 100).length,
    aucune: surveillantsData.filter(s => s.pourcentage_completion === 0).length,
    pourcentageMoyen: surveillantsData.length > 0 
      ? Math.round(surveillantsData.reduce((sum, s) => sum + s.pourcentage_completion, 0) / surveillantsData.length)
      : 0
  };

  // Types uniques pour le filtre
  const typesUniques = Array.from(new Set(surveillantsData.map(s => s.type))).sort();

  const exportToExcel = () => {
    const dataToExport = surveillantsTries.map(surveillant => ({
      'Nom': surveillant.nom,
      'Prénom': surveillant.prenom,
      'Email': surveillant.email,
      'Type': surveillant.type,
      'Faculté': surveillant.faculte,
      'Créneaux répondus': surveillant.creneaux_repondus,
      'Total créneaux': surveillant.total_creneaux,
      'Pourcentage': `${surveillant.pourcentage_completion}%`,
      'Dernière réponse': surveillant.derniere_reponse 
        ? new Date(surveillant.derniere_reponse).toLocaleDateString('fr-FR')
        : 'Jamais'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Disponibilités');
    XLSX.writeFile(wb, `suivi_disponibilites_${activeSession?.name || 'session'}.xlsx`);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune session active sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total surveillants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.complets}</div>
            <div className="text-sm text-gray-600">Complets (100%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.partiels}</div>
            <div className="text-sm text-gray-600">Partiels</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.aucune}</div>
            <div className="text-sm text-gray-600">Aucune réponse</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.pourcentageMoyen}%</div>
            <div className="text-sm text-gray-600">Taux moyen</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Suivi des Disponibilités - {activeSession.name}</span>
            </span>
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un surveillant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                {typesUniques.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completion_desc">Complétion (décroissant)</SelectItem>
                <SelectItem value="completion_asc">Complétion (croissant)</SelectItem>
                <SelectItem value="nom">Nom alphabétique</SelectItem>
                <SelectItem value="derniere_reponse">Dernière réponse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{surveillantsTries.length} surveillants affichés</span>
            <span>Total de {totalCreneaux} créneaux dans cette session</span>
          </div>
        </CardContent>
      </Card>

      {/* Vue des disponibilités avec possibilité de modification */}
      <Card>
        <CardHeader>
          <CardTitle>Liste détaillée avec modification</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          ) : (
            <DisponibilitesAdminView />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
