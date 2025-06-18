
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Users, Search, Download, Star, CheckCircle, Eye, AlertCircle, UserX } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { DisponibiliteDetailModal } from "./DisponibiliteDetailModal";
import * as XLSX from 'xlsx';

interface SurveillantStats {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  total_disponibilites: number;
  obligatoires: number;
  souhaitees: number;
  a_soumis: boolean;
}

interface Disponibilite {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: string;
  nom_examen_selectionne?: string;
  nom_examen_obligatoire?: string;
  commentaire_surveillance_obligatoire?: string;
}

export const SuiviDisponibilitesAdmin = () => {
  const { data: activeSession } = useActiveSession();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurveillant, setSelectedSurveillant] = useState<SurveillantStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Récupérer toutes les données des surveillants avec leurs disponibilités
  const { data: surveillantsStats = [], isLoading } = useQuery({
    queryKey: ['surveillants-stats', activeSession?.id],
    queryFn: async (): Promise<SurveillantStats[]> => {
      if (!activeSession?.id) return [];

      // Récupérer tous les surveillants actifs de la session
      const { data: surveillants, error: surveillantsError } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillants (
            id, nom, prenom, email, type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      if (surveillantsError) throw surveillantsError;

      // Récupérer toutes les disponibilités de la session
      const { data: disponibilites, error: dispoError } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);

      if (dispoError) throw dispoError;

      // Créer les statistiques pour chaque surveillant
      const stats: SurveillantStats[] = [];
      
      const surveillantsList = surveillants.map(item => item.surveillants).filter(Boolean);
      
      for (const surveillant of surveillantsList) {
        if (!surveillant) continue;
        
        const surveillantDispos = disponibilites?.filter(d => d.surveillant_id === surveillant.id) || [];
        const obligatoires = surveillantDispos.filter(d => d.type_choix === 'obligatoire');
        const souhaitees = surveillantDispos.filter(d => d.type_choix !== 'obligatoire');
        
        stats.push({
          id: surveillant.id,
          nom: surveillant.nom,
          prenom: surveillant.prenom,
          email: surveillant.email,
          type: surveillant.type,
          total_disponibilites: surveillantDispos.length,
          obligatoires: obligatoires.length,
          souhaitees: souhaitees.length,
          a_soumis: surveillantDispos.length > 0
        });
      }

      return stats.sort((a, b) => {
        // Trier par statut de soumission (non-répondants d'abord), puis par nom
        if (a.a_soumis !== b.a_soumis) {
          return a.a_soumis ? 1 : -1;
        }
        return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      });
    },
    enabled: !!activeSession?.id
  });

  // Appliquer les filtres
  const filteredSurveillants = surveillantsStats.filter(surveillant => {
    // Filtre par type
    if (typeFilter !== "all" && surveillant.type !== typeFilter) return false;
    
    // Filtre par statut de soumission
    if (statusFilter === "responded" && !surveillant.a_soumis) return false;
    if (statusFilter === "not_responded" && surveillant.a_soumis) return false;
    
    // Filtre par recherche
    if (searchTerm && !`${surveillant.nom} ${surveillant.prenom} ${surveillant.email}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  // Récupérer les disponibilités détaillées pour un surveillant spécifique
  const { data: disponibilitesDetail = [] } = useQuery({
    queryKey: ['disponibilites-detail', selectedSurveillant?.id, activeSession?.id],
    queryFn: async (): Promise<Disponibilite[]> => {
      if (!selectedSurveillant?.id || !activeSession?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('surveillant_id', selectedSurveillant.id)
        .eq('est_disponible', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSurveillant?.id && !!activeSession?.id
  });

  const handleShowDetails = (surveillant: SurveillantStats) => {
    setSelectedSurveillant(surveillant);
    setModalOpen(true);
  };

  const exportToExcel = () => {
    if (filteredSurveillants.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucun surveillant à exporter.",
        variant: "destructive"
      });
      return;
    }

    const exportData = filteredSurveillants.map(s => ({
      'Nom': s.nom,
      'Prénom': s.prenom,
      'Email': s.email,
      'Type': s.type,
      'Total Disponibilités': s.total_disponibilites,
      'Surveillances Obligatoires': s.obligatoires,
      'Disponibilités Souhaitées': s.souhaitees,
      'A Soumis': s.a_soumis ? 'Oui' : 'Non'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suivi Disponibilités");

    const fileName = `suivi_disponibilites_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `Données exportées vers ${fileName}`,
    });
  };

  const exportNonRespondents = () => {
    const nonRespondents = surveillantsStats.filter(s => !s.a_soumis);
    
    if (nonRespondents.length === 0) {
      toast({
        title: "Aucun non-répondant",
        description: "Tous les surveillants ont déjà soumis leurs disponibilités.",
      });
      return;
    }

    const exportData = nonRespondents.map(s => ({
      'Nom': s.nom,
      'Prénom': s.prenom,
      'Email': s.email,
      'Type': s.type
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Non Répondants");

    const fileName = `non_repondants_${activeSession?.name || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export réussi",
      description: `${nonRespondents.length} non-répondants exportés vers ${fileName}`,
    });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir le suivi des disponibilités.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSurveillants = surveillantsStats.length;
  const ayantSoumis = surveillantsStats.filter(s => s.a_soumis).length;
  const nonRepondants = totalSurveillants - ayantSoumis;
  const tauxReponse = totalSurveillants > 0 ? Math.round((ayantSoumis / totalSurveillants) * 100) : 0;
  const totalDisponibilites = surveillantsStats.reduce((sum, s) => sum + s.total_disponibilites, 0);
  const totalObligatoires = surveillantsStats.reduce((sum, s) => sum + s.obligatoires, 0);

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Suivi des disponibilités par surveillant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={exportNonRespondents} variant="outline" className="flex items-center space-x-2">
                  <UserX className="h-4 w-4" />
                  <span>Exporter non-répondants</span>
                </Button>
                <Button onClick={exportToExcel} className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Exporter Excel</span>
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Session {activeSession.name} - Vue détaillée par surveillant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtres */}
            <div className="flex space-x-4 mb-6">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Assistant">Assistant</SelectItem>
                  <SelectItem value="Jobiste">Jobiste</SelectItem>
                  <SelectItem value="PAT">PAT</SelectItem>
                  <SelectItem value="FASB">FASB</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="responded">Ont répondu</SelectItem>
                  <SelectItem value="not_responded">N'ont pas encore répondu</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher par nom, prénom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Statistiques globales avec pourcentage d'accomplissement */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalSurveillants}</div>
                    <div className="text-sm text-blue-700">Surveillants actifs</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`border-2 ${tauxReponse >= 80 ? 'border-green-200 bg-green-50' : tauxReponse >= 50 ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${tauxReponse >= 80 ? 'text-green-600' : tauxReponse >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                      {ayantSoumis}/{totalSurveillants}
                    </div>
                    <div className={`text-sm ${tauxReponse >= 80 ? 'text-green-700' : tauxReponse >= 50 ? 'text-orange-700' : 'text-red-700'}`}>
                      Ont répondu ({tauxReponse}%)
                    </div>
                    <Progress 
                      value={tauxReponse} 
                      className={`mt-2 ${tauxReponse >= 80 ? '[&>div]:bg-green-500' : tauxReponse >= 50 ? '[&>div]:bg-orange-500' : '[&>div]:bg-red-500'}`}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{nonRepondants}</div>
                    <div className="text-sm text-red-700">À relancer</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{totalDisponibilites}</div>
                    <div className="text-sm text-purple-700">Total disponibilités</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{totalObligatoires}</div>
                    <div className="text-sm text-orange-700">Surveillances obligatoires</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Affichage du nombre de résultats filtrés */}
            {(typeFilter !== "all" || statusFilter !== "all" || searchTerm) && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  {filteredSurveillants.length} surveillant{filteredSurveillants.length > 1 ? 's' : ''} 
                  {filteredSurveillants.length !== totalSurveillants && ` sur ${totalSurveillants}`} 
                  affiché{filteredSurveillants.length > 1 ? 's' : ''} selon les filtres appliqués
                </p>
              </div>
            )}

            {/* Tableau des surveillants */}
            {isLoading ? (
              <p>Chargement...</p>
            ) : filteredSurveillants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Surveillant</th>
                      <th className="border border-gray-300 p-3 text-left">Type</th>
                      <th className="border border-gray-300 p-3 text-center">Total</th>
                      <th className="border border-gray-300 p-3 text-center">Obligatoires</th>
                      <th className="border border-gray-300 p-3 text-center">Souhaitées</th>
                      <th className="border border-gray-300 p-3 text-center">Statut</th>
                      <th className="border border-gray-300 p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSurveillants.map((surveillant) => (
                      <tr key={surveillant.id} className={`hover:bg-gray-50 ${!surveillant.a_soumis ? 'bg-red-50' : ''}`}>
                        <td className="border border-gray-300 p-3">
                          <div>
                            <div className="font-medium">{surveillant.nom} {surveillant.prenom}</div>
                            <div className="text-sm text-gray-600">{surveillant.email}</div>
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <Badge variant="outline">{surveillant.type}</Badge>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowDetails(surveillant)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            {surveillant.total_disponibilites}
                          </Button>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {surveillant.obligatoires > 0 && <Star className="h-3 w-3 text-orange-500" />}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowDetails(surveillant)}
                              className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                            >
                              {surveillant.obligatoires}
                            </Button>
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowDetails(surveillant)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          >
                            {surveillant.souhaitees}
                          </Button>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <div className="flex items-center justify-center">
                            {surveillant.a_soumis ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowDetails(surveillant)}
                            className="flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Détails</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun surveillant trouvé pour les critères sélectionnés.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DisponibiliteDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        surveillant={selectedSurveillant}
        disponibilites={disponibilitesDetail}
      />
    </>
  );
};
