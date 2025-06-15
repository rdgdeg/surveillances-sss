import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { ExamenReview, ContrainteAuditoire, ExamenGroupe } from "@/utils/examenReviewUtils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExamenEditModal } from "./ExamenEditModal";
import { useState } from "react";

export function ExamenReviewManager() {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editingExamens, setEditingExamens] = useState<Record<string, Partial<ExamenGroupe>>>({});
  const [selectedGroupes, setSelectedGroupes] = useState<Set<string>>(new Set());
  const [searchCode, setSearchCode] = useState("");
  const [editExamenId, setEditExamenId] = useState<string | null>(null);

  // Ajout pour la modale et options facultés liste
  const faculteOptions = [
    { value: "FASB", label: "FASB" },
    { value: "EPL", label: "EPL" },
    { value: "FIAL", label: "FIAL" },
    { value: "PSSP", label: "PSSP" },
    { value: "LSM", label: "LSM" },
    { value: "ESPO", label: "ESPO" },
    { value: "FSP", label: "FSP" },
    { value: "FSM", label: "FSM" },
    { value: "ASS", label: "ASS" },
    { value: "MEDE", label: "MEDE" },
    { value: "AUTRE", label: "Autre" },
  ];

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-review', activeSession?.id],
    queryFn: async (): Promise<ExamenReview[]> => {
      if (!activeSession?.id) return [];

      let query = supabase
        .from('examens')
        .select(`
          *,
          personnes_aidantes (*)
        `)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'NON_TRAITE')
        .eq('is_active', true)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true })
        .order('code_examen', { ascending: true });

      if (searchCode) {
        query = query.ilike('code_examen', `%${searchCode}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const { data: contraintesAuditoires } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async (): Promise<ContrainteAuditoire[]> => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');

      if (error) throw error;
      return data || [];
    }
  });

  const updateExamenMutation = useMutation({
    mutationFn: async ({ groupe, updates }: { groupe: ExamenGroupe; updates: Partial<ExamenGroupe> }) => {
      for (const examen of groupe.examens) {
        const examenUpdates: any = {};

        if (updates.nombre_surveillants_total !== undefined) {
          examenUpdates.nombre_surveillants = Math.ceil(updates.nombre_surveillants_total / groupe.examens.length);
        }

        if (updates.surveillants_enseignant_total !== undefined) {
          examenUpdates.surveillants_enseignant = Math.ceil(updates.surveillants_enseignant_total / groupe.examens.length);
        }

        if (updates.surveillants_amenes_total !== undefined) {
          examenUpdates.surveillants_amenes = Math.ceil(updates.surveillants_amenes_total / groupe.examens.length);
        }

        if (updates.surveillants_pre_assignes_total !== undefined) {
          examenUpdates.surveillants_pre_assignes = Math.ceil(updates.surveillants_pre_assignes_total / groupe.examens.length);
        }

        if (Object.keys(examenUpdates).length > 0) {
          const { error } = await supabase
            .from('examens')
            .update(examenUpdates)
            .eq('id', examen.id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      setEditingExamens({});
      toast({
        title: "Examens mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les examens.",
        variant: "destructive"
      });
    }
  });

  const validateExamensMutation = useMutation({
    mutationFn: async (groupes: ExamenGroupe[]) => {
      const examensToValidate = groupes.flatMap(groupe => groupe.examens);

      for (const examen of examensToValidate) {
        const { error } = await supabase
          .from('examens')
          .update({ statut_validation: 'VALIDE' })
          .eq('id', examen.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, groupes) => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-valides'] });
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      setSelectedGroupes(new Set());
      toast({
        title: "Examens validés",
        description: `${groupes.length} groupe(s) d'examens ont été validés avec succès.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider les examens.",
        variant: "destructive"
      });
    }
  });

  const applquerContraintesAuditoiresMutation = useMutation({
    mutationFn: async () => {
      if (!examens || !contraintesAuditoires) return;

      for (const examen of examens) {
        const auditoire_unifie = examen.salle.trim().match(/^Neerveld\s+[A-Z]$/i) ? "Neerveld" : examen.salle.trim();

        let contrainteUnifiee = 1;
        if (auditoire_unifie === "Neerveld") {
          const contraintesNeerveld = contraintesAuditoires.filter(c =>
            c.auditoire.match(/^Neerveld\s+[A-Z]$/i)
          );
          contrainteUnifiee = contraintesNeerveld.reduce((sum, c) => sum + c.nombre_surveillants_requis, 0) || 1;
        } else {
          const contrainteExacte = contraintesAuditoires.find(c => c.auditoire === auditoire_unifie);
          if (contrainteExacte) {
            contrainteUnifiee = contrainteExacte.nombre_surveillants_requis;
          }
        }

        const { error } = await supabase
          .from('examens')
          .update({ nombre_surveillants: contrainteUnifiee })
          .eq('id', examen.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      toast({
        title: "Contraintes appliquées",
        description: "Les contraintes d'auditoires ont été appliquées à tous les examens.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'appliquer les contraintes.",
        variant: "destructive"
      });
    }
  });

  const toggleExamenActiveMutation = useMutation({
    mutationFn: async ({ examenId, isActive }: { examenId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('examens')
        .update({ is_active: isActive })
        .eq('id', examenId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-valides'] });
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: isActive ? "Examen activé" : "Examen désactivé",
        description: isActive
          ? "L'examen est maintenant actif et peut être attribué."
          : "L'examen est désactivé et ne sera pas attribué.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le statut de l'examen.",
        variant: "destructive"
      });
    }
  });

  const groupedExamens = examens ? examens.reduce((acc: Record<string, ExamenReview[]>, examen) => {
    const key = `${examen.code_examen}-${examen.date_examen}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(examen);
    return acc;
  }, {}) : {};

  const examenGroupsArray = Object.entries(groupedExamens).map(([key, examens]) => {
    const totalStudents = examens.reduce((sum, examen) => sum + (examen.nombre_etudiants || 0), 0);
    const totalSurveillants = examens.reduce((sum, examen) => sum + (examen.nombre_surveillants || 0), 0);
    const totalEnseignants = examens.reduce((sum, examen) => sum + (examen.surveillants_enseignant || 0), 0);
    const totalAmenes = examens.reduce((sum, examen) => sum + (examen.surveillants_amenes || 0), 0);
    const totalPreAssignes = examens.reduce((sum, examen) => sum + (examen.surveillants_pre_assignes || 0), 0);

    return {
      id: key,
      code_examen: examens[0].code_examen,
      date_examen: examens[0].date_examen,
      examens: examens,
      nombre_etudiants_total: totalStudents,
      nombre_surveillants_total: totalSurveillants,
      surveillants_enseignant_total: totalEnseignants,
      surveillants_amenes_total: totalAmenes,
      surveillants_pre_assignes_total: totalPreAssignes,
    };
  });

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleValidateSelected = async () => {
    const groupsToValidate = examenGroupsArray.filter(group => selectedGroupes.has(group.id));
    await validateExamensMutation.mutateAsync(groupsToValidate);
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Examens à Valider</CardTitle>
          <CardDescription>
            Liste des examens importés nécessitant une validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="search"
              placeholder="Rechercher par code examen..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant="outline"
              onClick={applquerContraintesAuditoiresMutation.mutate}
              disabled={applquerContraintesAuditoiresMutation.isLoading}
            >
              Appliquer les contraintes d'auditoires
            </Button>
            <Button
              onClick={handleValidateSelected}
              disabled={validateExamensMutation.isLoading || selectedGroupes.size === 0}
            >
              Valider la sélection ({selectedGroupes.size} groupes)
            </Button>
          </div>
        </CardContent>
      </Card>

      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th></th>
            <th>Code Examen</th>
            <th>Date</th>
            <th>Nombre d'étudiants</th>
            <th>Surveillants requis</th>
            <th>Enseignants</th>
            <th>Amenés</th>
            <th>Pré-assignés</th>
            <th>Actif</th>
            <th>Faculté</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8}>Chargement...</td>
            </tr>
          ) : examenGroupsArray.length === 0 ? (
            <tr>
              <td colSpan={8}>Aucun examen à valider.</td>
            </tr>
          ) : (
            examenGroupsArray.map(groupe => (
              <tr key={groupe.id} className="border-b">
                <td>
                  <Checkbox
                    checked={selectedGroupes.has(groupe.id)}
                    onCheckedChange={() => handleToggleGroup(groupe.id)}
                  />
                </td>
                <td>{groupe.code_examen}</td>
                <td>{groupe.date_examen}</td>
                <td>{groupe.nombre_etudiants_total}</td>
                <td>
                  <Input
                    type="number"
                    value={editingExamens[groupe.id]?.nombre_surveillants_total !== undefined
                      ? editingExamens[groupe.id]?.nombre_surveillants_total
                      : groupe.nombre_surveillants_total}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setEditingExamens(prev => ({
                        ...prev,
                        [groupe.id]: { ...prev[groupe.id], nombre_surveillants_total: value },
                      }));
                    }}
                    onBlur={async () => {
                      if (editingExamens[groupe.id]?.nombre_surveillants_total !== undefined) {
                        await updateExamenMutation.mutateAsync({
                          groupe: groupe,
                          updates: { nombre_surveillants_total: editingExamens[groupe.id].nombre_surveillants_total },
                        });
                      }
                    }}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={editingExamens[groupe.id]?.surveillants_enseignant_total !== undefined
                      ? editingExamens[groupe.id]?.surveillants_enseignant_total
                      : groupe.surveillants_enseignant_total}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setEditingExamens(prev => ({
                        ...prev,
                        [groupe.id]: { ...prev[groupe.id], surveillants_enseignant_total: value },
                      }));
                    }}
                    onBlur={async () => {
                      if (editingExamens[groupe.id]?.surveillants_enseignant_total !== undefined) {
                        await updateExamenMutation.mutateAsync({
                          groupe: groupe,
                          updates: { surveillants_enseignant_total: editingExamens[groupe.id].surveillants_enseignant_total },
                        });
                      }
                    }}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={editingExamens[groupe.id]?.surveillants_amenes_total !== undefined
                      ? editingExamens[groupe.id]?.surveillants_amenes_total
                      : groupe.surveillants_amenes_total}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setEditingExamens(prev => ({
                        ...prev,
                        [groupe.id]: { ...prev[groupe.id], surveillants_amenes_total: value },
                      }));
                    }}
                    onBlur={async () => {
                      if (editingExamens[groupe.id]?.surveillants_amenes_total !== undefined) {
                        await updateExamenMutation.mutateAsync({
                          groupe: groupe,
                          updates: { surveillants_amenes_total: editingExamens[groupe.id].surveillants_amenes_total },
                        });
                      }
                    }}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={editingExamens[groupe.id]?.surveillants_pre_assignes_total !== undefined
                      ? editingExamens[groupe.id]?.surveillants_pre_assignes_total
                      : groupe.surveillants_pre_assignes_total}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setEditingExamens(prev => ({
                        ...prev,
                        [groupe.id]: { ...prev[groupe.id], surveillants_pre_assignes_total: value },
                      }));
                    }}
                    onBlur={async () => {
                      if (editingExamens[groupe.id]?.surveillants_pre_assignes_total !== undefined) {
                        await updateExamenMutation.mutateAsync({
                          groupe: groupe,
                          updates: { surveillants_pre_assignes_total: editingExamens[groupe.id].surveillants_pre_assignes_total },
                        });
                      }
                    }}
                  />
                </td>
                <td>
                  {groupe.examens.map(examen => (
                    <div key={examen.id}>
                      <Badge variant={examen.is_active ? "default" : "secondary"}>
                        {examen.is_active ? "Activé" : "Désactivé"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExamenActiveMutation.mutate({
                          examenId: examen.id,
                          isActive: !examen.is_active,
                        })}
                        disabled={toggleExamenActiveMutation.isLoading}
                      >
                        Basculer
                      </Button>
                    </div>
                  ))}
                </td>
                <td>{faculteOptions.find(f => f.value === groupe.examens[0].faculte)?.label || groupe.examens[0].faculte || "-"}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => setEditExamenId(groupe.examens[0].id)}>
                    Éditer
                  </Button>
                  {editExamenId === groupe.examens[0].id && (
                    <ExamenEditModal
                      examen={groupe.examens[0]}
                      open={editExamenId === groupe.examens[0].id}
                      onClose={() => setEditExamenId(null)}
                      faculteOptions={faculteOptions}
                      onSaved={() => {
                        setEditExamenId(null);
                        queryClient.invalidateQueries({ queryKey: ['examens-review'] });
                      }}
                    />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
