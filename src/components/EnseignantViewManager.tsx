
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Users, Calendar, Clock, MapPin, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { groupExamens, ExamenGroupe } from "@/utils/examenReviewUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PersonneAidante {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  est_assistant: boolean;
}

interface ExamenWithTeam {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  code_examen: string | null;
  faculte: string | null;
  statut_validation: string | null;
  type_requis: string;
  surveillants_enseignant: number | null;
  surveillants_amenes: number | null;
  surveillants_pre_assignes: number | null;
  surveillants_a_attribuer: number | null;
  personnes_aidantes: PersonneAidante[];
  professeur_present: boolean;
  equipe_confirmee: boolean;
}

export const EnseignantViewManager = () => {
  const { data: activeSession } = useActiveSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'ALL' | 'VALIDE'>('VALIDE');
  const [faculteFilter, setFaculteFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: allExamens, isLoading } = useQuery({
    queryKey: ['examens-tous-avec-equipe', activeSession?.id],
    queryFn: async (): Promise<ExamenWithTeam[]> => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select(`
          *,
          personnes_aidantes!inner(
            id,
            nom,
            prenom,
            email,
            est_assistant
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(examen => ({
        ...examen,
        professeur_present: (examen.surveillants_enseignant || 0) > 0,
        equipe_confirmee: examen.personnes_aidantes?.length > 0
      }));
    },
    enabled: !!activeSession?.id
  });

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

  const faculteOptions = Array.from(new Set((allExamens || []).map(e => e.faculte).filter(Boolean)));

  const examensFiltres = useMemo(() => {
    let res = allExamens || [];
    if (statutFilter === 'VALIDE') res = res.filter(e => e.statut_validation === 'VALIDE');
    if (faculteFilter) res = res.filter(e => e.faculte === faculteFilter);
    if (codeFilter) res = res.filter(e => (e.code_examen || "").includes(codeFilter));
    return res;
  }, [allExamens, statutFilter, faculteFilter, codeFilter]);

  const totalExamens = allExamens?.length || 0;
  const totalValidés = allExamens?.filter(e => e.statut_validation === 'VALIDE').length || 0;

  // Convert ExamenWithTeam to ExamenReview format for groupExamens
  const examensForGrouping = useMemo(() => {
    return examensFiltres.map(examen => ({
      ...examen,
      nombre_surveillants: 1, // Default value if missing
      session_id: activeSession?.id || '',
      auditoire_original: examen.salle,
      besoins_confirmes_par_enseignant: false,
      created_at: new Date().toISOString(),
      date_confirmation_enseignant: null,
      duree: null,
      etudiants: null,
      enseignants: null,
      enseignant_nom: null,
      enseignant_email: null,
      lien_enseignant_token: null,
      token_expires_at: null,
      token_used_at: null,
      is_active: true,
      updated_at: new Date().toISOString()
    }));
  }, [examensFiltres, activeSession?.id]);

  const examensGroupes = useMemo(() => {
    if (!examensForGrouping || !contraintesAuditoires) return [];
    return groupExamens(examensForGrouping, contraintesAuditoires);
  }, [examensForGrouping, contraintesAuditoires]);

  const filteredExamens = useMemo(() => {
    if (!searchTerm.trim()) return examensGroupes;
    const searchLower = searchTerm.toLowerCase();
    return examensGroupes.filter(groupe =>
      groupe.code_examen?.toLowerCase().includes(searchLower) ||
      groupe.matiere.toLowerCase().includes(searchLower) ||
      groupe.auditoire_unifie.toLowerCase().includes(searchLower)
    );
  }, [examensGroupes, searchTerm]);

  const toggleRowExpansion = (groupeKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(groupeKey)) {
      newExpanded.delete(groupeKey);
    } else {
      newExpanded.add(groupeKey);
    }
    setExpandedRows(newExpanded);
  };

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
            <span>Vue Enseignant - Examens & Équipes</span>
          </CardTitle>
          <CardDescription>
            Consultez tous les examens de la session avec les détails des équipes pédagogiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher matière ou auditoire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div>
              <Input
                placeholder="Filtrer par code examen..."
                value={codeFilter}
                onChange={e => setCodeFilter(e.target.value)}
                className="w-44"
              />
            </div>
            <div>
              <Select value={faculteFilter} onValueChange={setFaculteFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrer par faculté..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les facultés</SelectItem>
                  {faculteOptions.map(fac => (
                    <SelectItem key={fac} value={fac}>{fac}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statutFilter} onValueChange={(val) => setStatutFilter(val as 'ALL' | 'VALIDE')}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Afficher..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALIDE">Examens validés uniquement</SelectItem>
                  <SelectItem value="ALL">Tous les examens actifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statistiques */}
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm text-gray-600">
              {totalValidés} examen{totalValidés > 1 ? 's' : ''} validé{totalValidés > 1 ? 's' : ''}
              {' / '}
              {totalExamens} au total dans la session
            </span>
            {statutFilter === "VALIDE" && (
              <span className="text-xs text-orange-600">
                Seuls les examens validés sont affichés.
              </span>
            )}
          </div>

          {/* Table */}
          {filteredExamens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'Aucun examen trouvé pour cette recherche.'
                : statutFilter === 'VALIDE'
                  ? 'Aucun examen validé trouvé.'
                  : 'Aucun examen trouvé pour cette session.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Code Examen</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Auditoire</TableHead>
                    <TableHead>Besoins Surveillance</TableHead>
                    <TableHead>Équipe Confirmée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExamens.map((groupe) => {
                    const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
                    const isExpanded = expandedRows.has(groupeKey);
                    const hasTeam = groupe.examens.some((e: any) => e.equipe_confirmee);
                    const hasProfesseur = groupe.examens.some((e: any) => e.professeur_present);
                    
                    return (
                      <>
                        <TableRow key={groupeKey}>
                          <TableCell>
                            {hasTeam && (
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRowExpansion(groupeKey)}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            )}
                          </TableCell>
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
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                {hasProfesseur ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Prof présent
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-gray-600">
                                    Prof absent
                                  </Badge>
                                )}
                              </div>
                              {hasTeam && (
                                <div className="text-xs text-blue-600">
                                  Équipe configurée (cliquer pour détails)
                                </div>
                              )}
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
                        {isExpanded && hasTeam && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-gray-50">
                              <Collapsible open={isExpanded}>
                                <CollapsibleContent>
                                  <div className="p-4 space-y-3">
                                    <h4 className="font-medium text-sm">Équipe pédagogique confirmée :</h4>
                                    {groupe.examens.map((examen: any) => 
                                      examen.personnes_aidantes?.length > 0 && (
                                        <div key={examen.id} className="space-y-2">
                                          {examen.salle && (
                                            <div className="text-xs font-medium text-gray-700">Salle {examen.salle} :</div>
                                          )}
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {examen.personnes_aidantes.map((personne: PersonneAidante) => (
                                              <div key={personne.id} className="flex items-center space-x-2 p-2 bg-white rounded border">
                                                <div className="flex-1">
                                                  <div className="text-sm font-medium">
                                                    {personne.nom} {personne.prenom}
                                                  </div>
                                                  <div className="text-xs text-gray-600">{personne.email}</div>
                                                </div>
                                                <div className="flex flex-col space-y-1">
                                                  <Badge 
                                                    variant={personne.est_assistant ? "default" : "secondary"}
                                                    className="text-xs"
                                                  >
                                                    {personne.est_assistant ? "Assistant" : "Autre"}
                                                  </Badge>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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
