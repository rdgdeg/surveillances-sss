
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { UserPlus, Trash2, Save } from "lucide-react";

interface Examen {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
}

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface PreAssignment {
  id?: string;
  examen_id: string;
  surveillant_id: string;
  is_pre_assigne: boolean;
  is_obligatoire: boolean;
  examen?: Examen;
  surveillant?: Surveillant;
}

export const PreAssignmentManager = () => {
  const { data: activeSession } = useActiveSession();
  const [examens, setExamens] = useState<Examen[]>([]);
  const [surveillants, setSurveillants] = useState<Surveillant[]>([]);
  const [preAssignments, setPreAssignments] = useState<PreAssignment[]>([]);
  const [selectedExamen, setSelectedExamen] = useState<string>("");
  const [selectedSurveillant, setSelectedSurveillant] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      if (!activeSession?.id) return;

      try {
        // Charger les examens validés
        const { data: examensData, error: examensError } = await supabase
          .from('examens')
          .select('id, code_examen, matiere, date_examen, heure_debut, heure_fin, salle')
          .eq('session_id', activeSession.id)
          .eq('statut_validation', 'VALIDE')
          .eq('is_active', true)
          .order('date_examen', { ascending: true })
          .order('heure_debut', { ascending: true });

        if (examensError) throw examensError;
        setExamens(examensData || []);

        // Charger les surveillants actifs
        const { data: surveillantsData, error: surveillantsError } = await supabase
          .from('surveillants')
          .select('id, nom, prenom, email, type')
          .eq('statut', 'actif')
          .order('nom', { ascending: true });

        if (surveillantsError) throw surveillantsError;
        setSurveillants(surveillantsData || []);

        // Charger les pré-assignations existantes
        const { data: attributionsData, error: attributionsError } = await supabase
          .from('attributions')
          .select(`
            id,
            examen_id,
            surveillant_id,
            is_pre_assigne,
            is_obligatoire,
            examens!inner(id, code_examen, matiere, date_examen, heure_debut, heure_fin, salle),
            surveillants!inner(id, nom, prenom, email, type)
          `)
          .eq('session_id', activeSession.id)
          .eq('is_pre_assigne', true);

        if (attributionsError) throw attributionsError;
        
        const formattedAssignments = (attributionsData || []).map(item => ({
          id: item.id,
          examen_id: item.examen_id,
          surveillant_id: item.surveillant_id,
          is_pre_assigne: item.is_pre_assigne,
          is_obligatoire: item.is_obligatoire,
          examen: item.examens,
          surveillant: item.surveillants
        }));

        setPreAssignments(formattedAssignments);

      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les données",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeSession?.id]);

  const ajouterPreAssignation = async () => {
    if (!selectedExamen || !selectedSurveillant || !activeSession?.id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un examen et un surveillant",
        variant: "destructive"
      });
      return;
    }

    // Vérifier si l'assignation existe déjà
    const existingAssignment = preAssignments.find(
      pa => pa.examen_id === selectedExamen && pa.surveillant_id === selectedSurveillant
    );

    if (existingAssignment) {
      toast({
        title: "Erreur",
        description: "Cette assignation existe déjà",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('attributions')
        .insert({
          examen_id: selectedExamen,
          surveillant_id: selectedSurveillant,
          session_id: activeSession.id,
          is_pre_assigne: true,
          is_obligatoire: true,
          is_locked: true
        })
        .select(`
          id,
          examen_id,
          surveillant_id,
          is_pre_assigne,
          is_obligatoire,
          examens!inner(id, code_examen, matiere, date_examen, heure_debut, heure_fin, salle),
          surveillants!inner(id, nom, prenom, email, type)
        `)
        .single();

      if (error) throw error;

      const newAssignment = {
        id: data.id,
        examen_id: data.examen_id,
        surveillant_id: data.surveillant_id,
        is_pre_assigne: data.is_pre_assigne,
        is_obligatoire: data.is_obligatoire,
        examen: data.examens,
        surveillant: data.surveillants
      };

      setPreAssignments([...preAssignments, newAssignment]);
      setSelectedExamen("");
      setSelectedSurveillant("");

      toast({
        title: "Assignation ajoutée",
        description: "La pré-assignation obligatoire a été créée avec succès",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter l'assignation",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const supprimerPreAssignation = async (assignmentId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('attributions')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setPreAssignments(preAssignments.filter(pa => pa.id !== assignmentId));

      toast({
        title: "Assignation supprimée",
        description: "La pré-assignation a été supprimée avec succès",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'assignation",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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
          <p className="text-center">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Pré-assignations Obligatoires</span>
          </CardTitle>
          <CardDescription>
            Définissez des surveillants qui doivent obligatoirement surveiller certains examens (ex: assistants pour leur cours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Examen</label>
              <Select value={selectedExamen} onValueChange={setSelectedExamen}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un examen" />
                </SelectTrigger>
                <SelectContent>
                  {examens.map((examen) => (
                    <SelectItem key={examen.id} value={examen.id}>
                      <div className="text-left">
                        <div className="font-medium">{examen.code_examen}</div>
                        <div className="text-xs text-gray-500">
                          {examen.date_examen} • {examen.heure_debut} • {examen.salle}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Surveillant</label>
              <Select value={selectedSurveillant} onValueChange={setSelectedSurveillant}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un surveillant" />
                </SelectTrigger>
                <SelectContent>
                  {surveillants.map((surveillant) => (
                    <SelectItem key={surveillant.id} value={surveillant.id}>
                      <div className="text-left">
                        <div className="font-medium">{surveillant.nom} {surveillant.prenom}</div>
                        <div className="text-xs text-gray-500">
                          {surveillant.type} • {surveillant.email}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={ajouterPreAssignation} 
                disabled={isSaving || !selectedExamen || !selectedSurveillant}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-assignations Existantes</CardTitle>
          <CardDescription>
            {preAssignments.length} pré-assignation(s) configurée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preAssignments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucune pré-assignation configurée. Utilisez le formulaire ci-dessus pour en ajouter.
            </p>
          ) : (
            <div className="space-y-3">
              {preAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="default">{assignment.examen?.code_examen}</Badge>
                      <Badge variant="secondary">{assignment.surveillant?.type}</Badge>
                      {assignment.is_obligatoire && (
                        <Badge variant="destructive">Obligatoire</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>
                        <strong>Examen:</strong> {assignment.examen?.matiere}
                      </div>
                      <div>
                        <strong>Date:</strong> {assignment.examen?.date_examen} • {assignment.examen?.heure_debut}-{assignment.examen?.heure_fin}
                      </div>
                      <div>
                        <strong>Salle:</strong> {assignment.examen?.salle}
                      </div>
                      <div>
                        <strong>Surveillant:</strong> {assignment.surveillant?.nom} {assignment.surveillant?.prenom}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => assignment.id && supprimerPreAssignation(assignment.id)}
                    disabled={isSaving}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
