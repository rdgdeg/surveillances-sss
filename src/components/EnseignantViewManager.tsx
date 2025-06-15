
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Users, Calendar, Clock, MapPin, Filter } from "lucide-react";
import { groupExamens, ExamenGroupe } from "@/utils/examenReviewUtils";

// Nouveau : Select (filtre)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const EnseignantViewManager = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState('');
  // Ajout du filtre de statut (ALL/VALIDE)
  const [statutFilter, setStatutFilter] = useState<'ALL' | 'VALIDE'>('VALIDE');

  // Requête pour TOUS les examens actifs
  const { data: allExamens, isLoading } = useQuery({
    queryKey: ['examens-tous', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Requête contraintes auditoires inchangée
  const { data: contraintesAuditoires } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');
      if (error) throw error;
      return data || [];
    }
  });

  // Deux filtres : statut filteré (VALIDE) ou non
  const examensFiltres = useMemo(() => {
    if (!allExamens) return [];
    return statutFilter === 'VALIDE'
      ? allExamens.filter((e: any) => e.statut_validation === 'VALIDE')
      : allExamens;
  }, [allExamens, statutFilter]);
  // Comptes pour l’UX
  const totalExamens = allExamens?.length || 0;
  const totalValidés = allExamens?.filter((e: any) => e.statut_validation === 'VALIDE').length || 0;

  // Grouper selon contraintes auditoires (comme avant)
  const examensGroupes = useMemo(() => {
    if (!examensFiltres || !contraintesAuditoires) return [];
    return groupExamens(examensFiltres, contraintesAuditoires);
  }, [examensFiltres, contraintesAuditoires]);

  // Filtre recherche utilisateur
  const filteredExamens = useMemo(() => {
    if (!searchTerm.trim()) return examensGroupes;
    const searchLower = searchTerm.toLowerCase();
    return examensGroupes.filter(groupe =>
      groupe.code_examen?.toLowerCase().includes(searchLower) ||
      groupe.matiere.toLowerCase().includes(searchLower) ||
      groupe.auditoire_unifie.toLowerCase().includes(searchLower)
    );
  }, [examensGroupes, searchTerm]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const formatTime = (timeStr: string) => timeStr.slice(0, 5);

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
          <p className="text-center">Chargement des examens...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Vue Enseignant - Examens</span>
          </CardTitle>
          <CardDescription>
            Consultez tous les examens de la session et leurs besoins en surveillance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher par code d'examen, matière ou auditoire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div>
              <Select value={statutFilter} onValueChange={(val) => setStatutFilter(val as 'ALL' | 'VALIDE')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Afficher..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALIDE">
                    Examens validés uniquement
                  </SelectItem>
                  <SelectItem value="ALL">
                    Tous les examens actifs
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Statistiques & info */}
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm text-gray-600">
              {totalValidés} examen{totalValidés > 1 ? 's' : ''} validé{totalValidés > 1 ? 's' : ''}
              {' / '}
              {totalExamens} au total dans la session
            </span>
            {statutFilter === "VALIDE" && (
              <span className="text-xs text-orange-600">
                Seuls les examens validés sont affichés. Passez sur "Tous les examens" pour tout voir.
              </span>
            )}
            {statutFilter === "ALL" && (
              <span className="text-xs text-blue-600">
                Tous les examens actifs de la session sont affichés, y compris ceux non validés.
              </span>
            )}
          </div>
          {/* Aucun examen ? */}
          {filteredExamens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'Aucun examen trouvé pour cette recherche.'
                : statutFilter === 'VALIDE'
                  ? 'Aucun examen validé trouvé. Changez le filtre pour afficher tous les examens.'
                  : 'Aucun examen trouvé pour cette session.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code Examen</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Auditoire</TableHead>
                    <TableHead>Besoins Surveillance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExamens.map((groupe) => {
                    const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
                    return (
                      <TableRow key={groupeKey}>
                        <TableCell className="font-medium">
                          {groupe.code_examen || 'Non défini'}
                        </TableCell>
                        <TableCell>{groupe.matiere}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(groupe.date_examen)}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(groupe.heure_debut)} - {formatTime(groupe.heure_fin)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{groupe.auditoire_unifie}</span>
                            <Badge variant="outline" className="text-xs">
                              {groupe.examens.length} salle{groupe.examens.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span className="text-sm font-medium">
                                {groupe.nombre_surveillants_total} surveillant{groupe.nombre_surveillants_total > 1 ? 's' : ''} requis
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                              <span>Enseignant: {groupe.surveillants_enseignant_total}</span>
                              <span>Amenés: {groupe.surveillants_amenes_total}</span>
                              <span>Pré-assignés: {groupe.surveillants_pre_assignes_total}</span>
                              <span>À attribuer: {groupe.surveillants_a_attribuer_total}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default"
                            className={
                              groupe.examens.every((e: any) => e.statut_validation === 'VALIDE')
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {groupe.examens.every((e: any) => e.statut_validation === 'VALIDE')
                              ? "Validé"
                              : "À valider"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.location.href = "/enseignant";
                            }}
                          >
                            Confirmer besoins
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Résumé */}
          {filteredExamens.length > 0 && (
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                {filteredExamens.length} groupe{filteredExamens.length > 1 ? 's' : ''} d'examens affiché{filteredExamens.length > 1 ? 's' : ''}
              </span>
              <span>
                Total: {filteredExamens.reduce((sum, g) => sum + g.surveillants_a_attribuer_total, 0)} surveillants à attribuer
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

