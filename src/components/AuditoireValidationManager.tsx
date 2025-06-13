
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, MapPin, Plus, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";

interface ExamenAuditoireIssue {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  auditoire_detecte: string;
  contrainte_existante: boolean;
  suggestions: string[];
}

interface AuditoireMapping {
  auditoire_original: string;
  auditoire_cible: string;
  action: 'MAP' | 'CREATE';
  nombre_surveillants?: number;
}

export const AuditoireValidationManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Record<string, AuditoireMapping>>({});

  // Récupérer les examens avec problèmes d'auditoires
  const { data: examensWithIssues, isLoading } = useQuery({
    queryKey: ['examens-auditoire-issues', activeSession?.id],
    queryFn: async (): Promise<ExamenAuditoireIssue[]> => {
      if (!activeSession?.id) return [];

      // Récupérer les examens non validés
      const { data: examens, error: examensError } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'NON_TRAITE');

      if (examensError) throw examensError;

      // Récupérer les contraintes d'auditoires existantes
      const { data: contraintes, error: contraintesError } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');

      if (contraintesError) throw contraintesError;

      const contraintesMap = new Map(contraintes.map(c => [c.auditoire.toLowerCase(), c]));
      const issues: ExamenAuditoireIssue[] = [];

      examens.forEach(examen => {
        const salle = examen.salle.trim();
        const salleNormalisee = salle.toLowerCase();
        
        // Vérifier si l'auditoire existe dans les contraintes
        if (!contraintesMap.has(salleNormalisee)) {
          // Chercher des suggestions similaires
          const suggestions = contraintes
            .filter(c => 
              c.auditoire.toLowerCase().includes(salleNormalisee.substring(0, 3)) ||
              salleNormalisee.includes(c.auditoire.toLowerCase().substring(0, 3))
            )
            .map(c => c.auditoire)
            .slice(0, 3);

          issues.push({
            id: examen.id,
            code_examen: examen.code_examen || '',
            matiere: examen.matiere,
            date_examen: examen.date_examen,
            heure_debut: examen.heure_debut,
            heure_fin: examen.heure_fin,
            salle: examen.salle,
            auditoire_detecte: salle,
            contrainte_existante: false,
            suggestions
          });
        }
      });

      return issues;
    },
    enabled: !!activeSession?.id
  });

  // Récupérer toutes les contraintes pour les options de mapping
  const { data: toutesContraintes } = useQuery({
    queryKey: ['all-contraintes-auditoires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis')
        .order('auditoire');
      
      if (error) throw error;
      return data || [];
    }
  });

  const appliqueMappingsMutation = useMutation({
    mutationFn: async (mappingsToApply: Record<string, AuditoireMapping>) => {
      const examensToUpdate: string[] = [];
      
      for (const [auditoire, mapping] of Object.entries(mappingsToApply)) {
        if (mapping.action === 'CREATE') {
          // Créer une nouvelle contrainte d'auditoire
          const { error: createError } = await supabase
            .from('contraintes_auditoires')
            .insert({
              auditoire: mapping.auditoire_cible,
              nombre_surveillants_requis: mapping.nombre_surveillants || 1
            });
          
          if (createError) throw createError;
        }

        // Mettre à jour les examens qui utilisent cet auditoire
        const examensToUpdateForThis = examensWithIssues?.filter(e => 
          e.auditoire_detecte === auditoire
        ) || [];

        for (const examen of examensToUpdateForThis) {
          const { error: updateError } = await supabase
            .from('examens')
            .update({ 
              salle: mapping.auditoire_cible,
              statut_validation: 'VALIDE'
            })
            .eq('id', examen.id);
          
          if (updateError) throw updateError;
          examensToUpdate.push(examen.id);
        }
      }

      return examensToUpdate;
    },
    onSuccess: (examensUpdated) => {
      queryClient.invalidateQueries({ queryKey: ['examens-auditoire-issues'] });
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['all-contraintes-auditoires'] });
      setMappings({});
      toast({
        title: "Mappings appliqués",
        description: `${examensUpdated.length} examens ont été mis à jour avec succès.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'appliquer les mappings.",
        variant: "destructive"
      });
    }
  });

  const handleMappingChange = (auditoire: string, field: keyof AuditoireMapping, value: string | number) => {
    setMappings(prev => ({
      ...prev,
      [auditoire]: {
        ...prev[auditoire],
        auditoire_original: auditoire,
        [field]: value
      }
    }));
  };

  const handleApplyMappings = () => {
    const validMappings = Object.fromEntries(
      Object.entries(mappings).filter(([_, mapping]) => 
        mapping.auditoire_cible && mapping.action
      )
    );

    if (Object.keys(validMappings).length === 0) {
      toast({
        title: "Aucun mapping",
        description: "Veuillez configurer au moins un mapping avant d'appliquer.",
        variant: "destructive"
      });
      return;
    }

    appliqueMappingsMutation.mutate(validMappings);
  };

  // Grouper les problèmes par auditoire
  const problemesGroupes = useMemo(() => {
    if (!examensWithIssues) return {};
    
    const groupes: Record<string, ExamenAuditoireIssue[]> = {};
    examensWithIssues.forEach(issue => {
      if (!groupes[issue.auditoire_detecte]) {
        groupes[issue.auditoire_detecte] = [];
      }
      groupes[issue.auditoire_detecte].push(issue);
    });
    
    return groupes;
  }, [examensWithIssues]);

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
          <p className="text-center">Analyse des auditoires en cours...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Validation des Auditoires</span>
          </CardTitle>
          <CardDescription>
            Corrigez les auditoires non reconnus avant de procéder à la validation finale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(problemesGroupes).length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-green-600 font-medium">Tous les auditoires sont reconnus !</p>
              <p className="text-sm text-gray-500 mt-2">
                Vous pouvez procéder à la validation des examens.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 text-sm">
                  {Object.keys(problemesGroupes).length} auditoire(s) non reconnu(s) trouvé(s)
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(problemesGroupes).map(([auditoire, issues]) => (
                  <Card key={auditoire} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Auditoire: {auditoire}</span>
                        <Badge variant="outline">{issues.length} examen(s)</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <strong>Examens concernés:</strong>
                        {issues.slice(0, 3).map(issue => (
                          <div key={issue.id} className="ml-2">
                            • {issue.code_examen} - {formatDateWithDayBelgian(issue.date_examen)} {issue.heure_debut}
                          </div>
                        ))}
                        {issues.length > 3 && (
                          <div className="ml-2 text-gray-500">... et {issues.length - 3} autre(s)</div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Action</label>
                          <Select
                            value={mappings[auditoire]?.action || ''}
                            onValueChange={(value) => handleMappingChange(auditoire, 'action', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MAP">Mapper vers auditoire existant</SelectItem>
                              <SelectItem value="CREATE">Créer nouvel auditoire</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {mappings[auditoire]?.action === 'CREATE' ? 'Nom du nouvel auditoire' : 'Auditoire cible'}
                          </label>
                          {mappings[auditoire]?.action === 'MAP' ? (
                            <Select
                              value={mappings[auditoire]?.auditoire_cible || ''}
                              onValueChange={(value) => handleMappingChange(auditoire, 'auditoire_cible', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un auditoire" />
                              </SelectTrigger>
                              <SelectContent>
                                {toutesContraintes?.map(contrainte => (
                                  <SelectItem key={contrainte.auditoire} value={contrainte.auditoire}>
                                    {contrainte.auditoire} ({contrainte.nombre_surveillants_requis} surveillants)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Nom de l'auditoire"
                              value={mappings[auditoire]?.auditoire_cible || ''}
                              onChange={(e) => handleMappingChange(auditoire, 'auditoire_cible', e.target.value)}
                            />
                          )}
                        </div>

                        {mappings[auditoire]?.action === 'CREATE' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Nb surveillants requis</label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              value={mappings[auditoire]?.nombre_surveillants || ''}
                              onChange={(e) => handleMappingChange(auditoire, 'nombre_surveillants', parseInt(e.target.value) || 1)}
                            />
                          </div>
                        )}
                      </div>

                      {issues[0].suggestions.length > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-600">Suggestions: </span>
                          {issues[0].suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="ml-1 h-6 text-xs"
                              onClick={() => {
                                handleMappingChange(auditoire, 'action', 'MAP');
                                handleMappingChange(auditoire, 'auditoire_cible', suggestion);
                              }}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleApplyMappings}
                  disabled={appliqueMappingsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Appliquer les mappings ({Object.keys(mappings).length})
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
