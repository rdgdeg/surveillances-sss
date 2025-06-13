
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Search, Users, Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";

export const EnseignantExamenForm = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<any>(null);
  const [newPersonne, setNewPersonne] = useState({
    nom: "",
    prenom: "",
    email: "",
    est_assistant: false,
    compte_dans_quota: true,
    present_sur_place: true
  });

  const { data: examensValides } = useQuery({
    queryKey: ['examens-enseignant', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select(`
          *,
          personnes_aidantes (*)
        `)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const ajouterPersonneMutation = useMutation({
    mutationFn: async ({ examenId, personne }: { examenId: string; personne: any }) => {
      const { error } = await supabase
        .from('personnes_aidantes')
        .insert({
          examen_id: examenId,
          ...personne
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      setNewPersonne({
        nom: "",
        prenom: "",
        email: "",
        est_assistant: false,
        compte_dans_quota: true,
        present_sur_place: true
      });
      toast({
        title: "Personne ajoutée",
        description: "La personne aidante a été ajoutée avec succès."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la personne.",
        variant: "destructive"
      });
    }
  });

  const supprimerPersonneMutation = useMutation({
    mutationFn: async (personneId: string) => {
      const { error } = await supabase
        .from('personnes_aidantes')
        .delete()
        .eq('id', personneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Personne supprimée",
        description: "La personne aidante a été supprimée."
      });
    }
  });

  const confirmerExamenMutation = useMutation({
    mutationFn: async (examenId: string) => {
      const { error } = await supabase
        .from('examens')
        .update({
          besoins_confirmes_par_enseignant: true,
          date_confirmation_enseignant: new Date().toISOString()
        })
        .eq('id', examenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Examen confirmé",
        description: "Les besoins de surveillance ont été confirmés."
      });
    }
  });

  const examenTrouve = examensValides?.find(e => 
    e.code_examen?.toLowerCase().includes(searchCode.toLowerCase())
  );

  useEffect(() => {
    if (examenTrouve && searchCode) {
      setSelectedExamen(examenTrouve);
    }
  }, [examenTrouve, searchCode]);

  const handleAjouterPersonne = () => {
    if (!selectedExamen || !newPersonne.nom || !newPersonne.prenom) {
      toast({
        title: "Champs requis",
        description: "Nom et prénom sont obligatoires.",
        variant: "destructive"
      });
      return;
    }

    ajouterPersonneMutation.mutate({
      examenId: selectedExamen.id,
      personne: newPersonne
    });
  };

  const calculerSurveillantsPedagogiques = (examen: any) => {
    if (!examen.personnes_aidantes) return 0;
    
    return examen.personnes_aidantes.filter((p: any) => 
      p.compte_dans_quota && p.present_sur_place
    ).length;
  };

  const calculerSurveillantsNecessaires = (examen: any) => {
    const pedagogiques = calculerSurveillantsPedagogiques(examen);
    const necessaires = Math.max(0, examen.nombre_surveillants - pedagogiques);
    return necessaires;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active trouvée.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Rechercher votre examen</span>
          </CardTitle>
          <CardDescription>
            Entrez le code de votre examen pour renseigner vos besoins de surveillance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Code d'examen..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setSelectedExamen(examenTrouve)} disabled={!examenTrouve}>
              Rechercher
            </Button>
          </div>
          
          {searchCode && !examenTrouve && (
            <p className="text-sm text-red-600">Aucun examen trouvé avec ce code.</p>
          )}
        </CardContent>
      </Card>

      {selectedExamen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedExamen.matiere}</span>
              <Badge variant={selectedExamen.besoins_confirmes_par_enseignant ? "default" : "secondary"}>
                {selectedExamen.besoins_confirmes_par_enseignant ? "Confirmé" : "En attente"}
              </Badge>
            </CardTitle>
            <CardDescription>
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(selectedExamen.date_examen)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{selectedExamen.heure_debut} - {selectedExamen.heure_fin}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{selectedExamen.salle}</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedExamen.nombre_surveillants}
                </div>
                <div className="text-sm text-gray-600">Surveillants théoriques</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {calculerSurveillantsPedagogiques(selectedExamen)}
                </div>
                <div className="text-sm text-gray-600">Équipe pédagogique</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {calculerSurveillantsNecessaires(selectedExamen)}
                </div>
                <div className="text-sm text-gray-600">Surveillants à attribuer</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Ajouter une personne de votre équipe</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={newPersonne.nom}
                    onChange={(e) => setNewPersonne({...newPersonne, nom: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={newPersonne.prenom}
                    onChange={(e) => setNewPersonne({...newPersonne, prenom: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPersonne.email}
                    onChange={(e) => setNewPersonne({...newPersonne, email: e.target.value})}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newPersonne.est_assistant}
                      onCheckedChange={(checked) => 
                        setNewPersonne({...newPersonne, est_assistant: checked as boolean})
                      }
                    />
                    <Label>Assistant qualifié</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newPersonne.compte_dans_quota}
                      onCheckedChange={(checked) => 
                        setNewPersonne({...newPersonne, compte_dans_quota: checked as boolean})
                      }
                    />
                    <Label>Compte dans le quota de surveillance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={newPersonne.present_sur_place}
                      onCheckedChange={(checked) => 
                        setNewPersonne({...newPersonne, present_sur_place: checked as boolean})
                      }
                    />
                    <Label>Présent sur place</Label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Button 
                    onClick={handleAjouterPersonne}
                    disabled={ajouterPersonneMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </div>

            {selectedExamen.personnes_aidantes && selectedExamen.personnes_aidantes.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Équipe pédagogique</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Quota</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExamen.personnes_aidantes.map((personne: any) => (
                      <TableRow key={personne.id}>
                        <TableCell>{personne.nom}</TableCell>
                        <TableCell>{personne.prenom}</TableCell>
                        <TableCell>
                          <div className="space-x-1">
                            {personne.est_assistant && <Badge variant="secondary">Assistant</Badge>}
                            {!personne.present_sur_place && <Badge variant="outline">Absent</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {personne.compte_dans_quota && personne.present_sur_place ? "✓" : "✗"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => supprimerPersonneMutation.mutate(personne.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => confirmerExamenMutation.mutate(selectedExamen.id)}
                disabled={confirmerExamenMutation.isPending || selectedExamen.besoins_confirmes_par_enseignant}
              >
                <Save className="mr-2 h-4 w-4" />
                {selectedExamen.besoins_confirmes_par_enseignant ? "Déjà confirmé" : "Confirmer les besoins"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
