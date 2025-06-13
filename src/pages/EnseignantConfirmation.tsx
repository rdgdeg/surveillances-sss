
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Plus, Trash2, Save } from "lucide-react";

interface Examen {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  nombre_surveillants: number;
  surveillants_a_attribuer: number;
  enseignant_nom: string;
  enseignant_email: string;
}

interface PersonneAidante {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  est_assistant: boolean;
  present_sur_place: boolean;
  compte_dans_quota: boolean;
}

const EnseignantConfirmation = () => {
  const [searchCode, setSearchCode] = useState("");
  const [suggestions, setSuggestions] = useState<Examen[]>([]);
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const [personnesAidantes, setPersonnesAidantes] = useState<PersonneAidante[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Recherche d'examens avec autocomplétion
  useEffect(() => {
    const searchExamens = async () => {
      if (searchCode.length < 3) {
        setSuggestions([]);
        return;
      }

      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .ilike('code_examen', `%${searchCode}%`)
        .eq('statut_validation', 'VALIDE')
        .limit(10);

      if (error) {
        console.error('Erreur recherche examens:', error);
        return;
      }

      setSuggestions(data || []);
    };

    const timeoutId = setTimeout(searchExamens, 300);
    return () => clearTimeout(timeoutId);
  }, [searchCode]);

  // Charger les personnes aidantes existantes
  useEffect(() => {
    const loadPersonnesAidantes = async () => {
      if (!selectedExamen) return;

      const { data, error } = await supabase
        .from('personnes_aidantes')
        .select('*')
        .eq('examen_id', selectedExamen.id);

      if (error) {
        console.error('Erreur chargement personnes aidantes:', error);
        return;
      }

      setPersonnesAidantes(data || []);
    };

    loadPersonnesAidantes();
  }, [selectedExamen]);

  const ajouterPersonne = () => {
    setPersonnesAidantes([
      ...personnesAidantes,
      {
        nom: "",
        prenom: "",
        email: "",
        est_assistant: false,
        present_sur_place: true,
        compte_dans_quota: true
      }
    ]);
  };

  const supprimerPersonne = (index: number) => {
    setPersonnesAidantes(personnesAidantes.filter((_, i) => i !== index));
  };

  const updatePersonne = (index: number, field: keyof PersonneAidante, value: any) => {
    const updated = [...personnesAidantes];
    updated[index] = {
      ...updated[index],
      [field]: value,
      // Si c'est un assistant, il compte dans le quota automatiquement
      compte_dans_quota: field === 'est_assistant' && value ? true : updated[index].compte_dans_quota
    };
    setPersonnesAidantes(updated);
  };

  const calculerSurveillantsRestants = () => {
    if (!selectedExamen) return 0;
    
    const personnesQuiComptent = personnesAidantes.filter(p => 
      p.present_sur_place && p.compte_dans_quota && p.nom.trim()
    ).length;
    
    return Math.max(0, selectedExamen.nombre_surveillants - personnesQuiComptent);
  };

  const sauvegarder = async () => {
    if (!selectedExamen) return;

    setIsLoading(true);
    try {
      // Supprimer les anciennes personnes aidantes
      await supabase
        .from('personnes_aidantes')
        .delete()
        .eq('examen_id', selectedExamen.id);

      // Ajouter les nouvelles personnes aidantes
      const personnesValides = personnesAidantes.filter(p => p.nom.trim());
      if (personnesValides.length > 0) {
        const { error: insertError } = await supabase
          .from('personnes_aidantes')
          .insert(
            personnesValides.map(p => ({
              examen_id: selectedExamen.id,
              nom: p.nom,
              prenom: p.prenom,
              email: p.email || null,
              est_assistant: p.est_assistant,
              present_sur_place: p.present_sur_place,
              compte_dans_quota: p.compte_dans_quota,
              ajoute_par: 'Enseignant'
            }))
          );

        if (insertError) throw insertError;
      }

      // Mettre à jour le nombre de surveillants à attribuer
      const surveillantsRestants = calculerSurveillantsRestants();
      const { error: updateError } = await supabase
        .from('examens')
        .update({
          surveillants_a_attribuer: surveillantsRestants,
          besoins_confirmes_par_enseignant: true,
          date_confirmation_enseignant: new Date().toISOString()
        })
        .eq('id', selectedExamen.id);

      if (updateError) throw updateError;

      toast({
        title: "Confirmation enregistrée",
        description: "Les informations ont été sauvegardées avec succès.",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Confirmation des besoins en surveillance</span>
          </CardTitle>
          <CardDescription>
            Recherchez votre examen et indiquez les personnes qui vous aideront pour ajuster les besoins en surveillants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recherche d'examen */}
          <div className="space-y-2">
            <Label htmlFor="search">Rechercher votre examen par code</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Ex: WDENT2152=E"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {suggestions.length > 0 && (
              <div className="border rounded-md bg-white shadow-sm max-h-60 overflow-y-auto">
                {suggestions.map((examen) => (
                  <div
                    key={examen.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setSelectedExamen(examen);
                      setSearchCode(examen.code_examen || "");
                      setSuggestions([]);
                    }}
                  >
                    <div className="font-medium">{examen.code_examen}</div>
                    <div className="text-sm text-gray-600">{examen.matiere}</div>
                    <div className="text-xs text-gray-500">
                      {examen.date_examen} • {examen.heure_debut}-{examen.heure_fin} • {examen.salle}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedExamen && (
            <>
              {/* Informations de l'examen */}
              <Card className="bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{selectedExamen.code_examen}</CardTitle>
                  <CardDescription>{selectedExamen.matiere}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Date :</strong> {selectedExamen.date_examen}
                    </div>
                    <div>
                      <strong>Horaire :</strong> {selectedExamen.heure_debut} - {selectedExamen.heure_fin}
                    </div>
                    <div>
                      <strong>Salle :</strong> {selectedExamen.salle}
                    </div>
                    <div>
                      <strong>Surveillants théoriques :</strong> 
                      <Badge variant="secondary" className="ml-2">
                        {selectedExamen.nombre_surveillants}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personnes aidantes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Personnes qui vous aident</h3>
                  <Button onClick={ajouterPersonne} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une personne
                  </Button>
                </div>

                {personnesAidantes.map((personne, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="pt-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        onClick={() => supprimerPersonne(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Nom</Label>
                          <Input
                            value={personne.nom}
                            onChange={(e) => updatePersonne(index, 'nom', e.target.value)}
                            placeholder="Nom"
                          />
                        </div>
                        <div>
                          <Label>Prénom</Label>
                          <Input
                            value={personne.prenom}
                            onChange={(e) => updatePersonne(index, 'prenom', e.target.value)}
                            placeholder="Prénom"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Label>Email (optionnel)</Label>
                        <Input
                          type="email"
                          value={personne.email}
                          onChange={(e) => updatePersonne(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={personne.est_assistant}
                            onCheckedChange={(checked) => updatePersonne(index, 'est_assistant', checked)}
                          />
                          <Label>Est assistant (décompte du quota)</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={personne.present_sur_place}
                            onCheckedChange={(checked) => updatePersonne(index, 'present_sur_place', checked)}
                          />
                          <Label>Présent sur place</Label>
                        </div>
                        
                        {!personne.est_assistant && (
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={personne.compte_dans_quota}
                              onCheckedChange={(checked) => updatePersonne(index, 'compte_dans_quota', checked)}
                            />
                            <Label>Compte dans le quota</Label>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Calcul des surveillants restants */}
              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {calculerSurveillantsRestants()}
                    </div>
                    <div className="text-sm text-green-600">
                      Surveillants à attribuer par l'administration
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commentaire */}
              <div>
                <Label htmlFor="commentaire">Commentaires ou remarques (optionnel)</Label>
                <Textarea
                  id="commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Ajoutez des informations complémentaires..."
                  rows={3}
                />
              </div>

              {/* Bouton de sauvegarde */}
              <Button onClick={sauvegarder} disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Enregistrement..." : "Confirmer et enregistrer"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnseignantConfirmation;
