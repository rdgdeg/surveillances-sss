
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Calendar, Clock, User } from "lucide-react";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  quota?: number | null;
  is_active?: boolean;
}

interface Disponibilite {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix?: string;
  nom_examen_obligatoire?: string;
}

interface SurveillantWithStats extends Surveillant {
  total_disponibilites: number;
  disponibilites_souhaitees: number;
  surveillances_obligatoires: number;
  taux_reponse: number;
  disponibilites: Disponibilite[];
}

export const SuiviDisponibilitesAdmin = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurveillant, setSelectedSurveillant] = useState<SurveillantWithStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Récupérer les surveillants avec leurs statistiques de disponibilités
  const { data: surveillantsWithStats, isLoading } = useQuery({
    queryKey: ['surveillants-with-stats', activeSession?.id],
    queryFn: async (): Promise<SurveillantWithStats[]> => {
      if (!activeSession?.id) return [];

      // Récupérer les surveillants actifs
      const { data: surveillantSessions, error: surveillantError } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillant_id,
          quota,
          is_active,
          surveillants!inner(
            id,
            nom,
            prenom,
            email,
            type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      if (surveillantError) throw surveillantError;

      // Récupérer toutes les disponibilités pour cette session
      const { data: disponibilites, error: dispError } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id);

      if (dispError) throw dispError;

      // Grouper les disponibilités par surveillant
      const dispoBySurveillant = disponibilites?.reduce((acc, dispo) => {
        if (!acc[dispo.surveillant_id]) {
          acc[dispo.surveillant_id] = [];
        }
        acc[dispo.surveillant_id].push(dispo);
        return acc;
      }, {} as Record<string, Disponibilite[]>) || {};

      // Combiner les données
      return (surveillantSessions || []).map((session: any) => {
        const surveillant = session.surveillants;
        const dispos = dispoBySurveillant[surveillant.id] || [];
        
        const disponibilitesValides = dispos.filter(d => d.est_disponible);
        const souhaitees = disponibilitesValides.filter(d => d.type_choix === 'souhaitee' || !d.type_choix);
        const obligatoires = disponibilitesValides.filter(d => d.type_choix === 'obligatoire');

        return {
          id: surveillant.id,
          nom: surveillant.nom,
          prenom: surveillant.prenom,
          email: surveillant.email,
          type: surveillant.type,
          quota: session.quota,
          is_active: session.is_active,
          total_disponibilites: disponibilitesValides.length,
          disponibilites_souhaitees: souhaitees.length,
          surveillances_obligatoires: obligatoires.length,
          taux_reponse: dispos.length > 0 ? Math.round((disponibilitesValides.length / Math.max(1, dispos.length)) * 100) : 0,
          disponibilites: dispos
        };
      });
    },
    enabled: !!activeSession?.id
  });

  // Filtrage des surveillants
  const filteredSurveillants = useMemo(() => {
    if (!surveillantsWithStats) return [];
    
    return surveillantsWithStats.filter(surveillant =>
      surveillant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [surveillantsWithStats, searchTerm]);

  const handleViewDetails = (surveillant: SurveillantWithStats) => {
    setSelectedSurveillant(surveillant);
    setDetailsOpen(true);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des données...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Suivi des disponibilités par personne</span>
          </CardTitle>
          <CardDescription>
            Vue détaillée des disponibilités de chaque surveillant avec possibilité de consulter le détail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barre de recherche */}
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, prénom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{filteredSurveillants.length}</div>
                <p className="text-sm text-gray-600">Total surveillants</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {filteredSurveillants.filter(s => s.total_disponibilites > 0).length}
                </div>
                <p className="text-sm text-gray-600">Ont répondu</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredSurveillants.filter(s => s.surveillances_obligatoires > 0).length}
                </div>
                <p className="text-sm text-gray-600">Surveillances obligatoires</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    filteredSurveillants.reduce((acc, s) => acc + s.taux_reponse, 0) / 
                    Math.max(1, filteredSurveillants.length)
                  )}%
                </div>
                <p className="text-sm text-gray-600">Taux moyen réponse</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des surveillants */}
          <div className="space-y-3">
            {filteredSurveillants.map((surveillant) => (
              <Card key={surveillant.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {surveillant.nom} {surveillant.prenom}
                          </h3>
                          <p className="text-sm text-gray-600">{surveillant.email}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{surveillant.type}</Badge>
                          <Badge variant="secondary">Quota: {surveillant.quota || 0}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {surveillant.total_disponibilites}
                        </div>
                        <p className="text-xs text-gray-500">Disponibilités</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {surveillant.disponibilites_souhaitees}
                        </div>
                        <p className="text-xs text-gray-500">Souhaitées</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {surveillant.surveillances_obligatoires}
                        </div>
                        <p className="text-xs text-gray-500">Obligatoires</p>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          surveillant.taux_reponse >= 80 ? 'text-green-600' :
                          surveillant.taux_reponse >= 50 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {surveillant.taux_reponse}%
                        </div>
                        <p className="text-xs text-gray-500">Taux réponse</p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(surveillant)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSurveillants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun surveillant trouvé.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de détails */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>
                Détails - {selectedSurveillant?.nom} {selectedSurveillant?.prenom}
              </span>
            </DialogTitle>
            <DialogDescription>
              Vue détaillée des disponibilités et préférences du surveillant.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSurveillant && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations personnelles</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Email:</strong> {selectedSurveillant.email}</p>
                    <p><strong>Type:</strong> {selectedSurveillant.type}</p>
                    <p><strong>Quota:</strong> {selectedSurveillant.quota || 0}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Statistiques</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Total disponibilités:</strong> {selectedSurveillant.total_disponibilites}</p>
                    <p><strong>Souhaitées:</strong> {selectedSurveillant.disponibilites_souhaitees}</p>
                    <p><strong>Obligatoires:</strong> {selectedSurveillant.surveillances_obligatoires}</p>
                    <p><strong>Taux de réponse:</strong> {selectedSurveillant.taux_reponse}%</p>
                  </div>
                </div>
              </div>

              {/* Liste des disponibilités */}
              <div>
                <h4 className="font-semibold mb-3">Disponibilités déclarées</h4>
                {selectedSurveillant.disponibilites.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedSurveillant.disponibilites
                      .filter(d => d.est_disponible)
                      .sort((a, b) => {
                        const dateCompare = a.date_examen.localeCompare(b.date_examen);
                        if (dateCompare !== 0) return dateCompare;
                        return a.heure_debut.localeCompare(b.heure_debut);
                      })
                      .map((dispo) => (
                        <div
                          key={dispo.id}
                          className={`p-3 rounded-lg border ${
                            dispo.type_choix === 'obligatoire' 
                              ? 'bg-orange-50 border-orange-200' 
                              : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {formatDateBelgian(dispo.date_examen)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>{formatTimeRange(dispo.heure_debut, dispo.heure_fin)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={dispo.type_choix === 'obligatoire' ? 'destructive' : 'default'}
                              >
                                {dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaitée'}
                              </Badge>
                              {dispo.nom_examen_obligatoire && (
                                <Badge variant="outline" className="text-xs">
                                  {dispo.nom_examen_obligatoire}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Aucune disponibilité déclarée.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
