
import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Trash2, Save, CheckCircle } from "lucide-react";

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
  besoins_confirmes_par_enseignant: boolean;
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

const EnseignantToken = () => {
  const { token } = useParams();
  const [examens, setExamens] = useState<Examen[]>([]);
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const [personnesAidantes, setPersonnesAidantes] = useState<PersonneAidante[]>([]);
  const [commentaire, setCommentaire] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  // Vérifier le token et charger les examens
  useEffect(() => {
    const loadExamens = async () => {
      if (!token) return;

      try {
        const { data, error } = await supabase
          .from('examens')
          .select('*')
          .eq('lien_enseignant_token', token)
          .eq('statut_validation', 'VALIDE');

        if (error) throw error;

        if (data && data.length > 0) {
          setExamens(data);
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      } catch (error) {
        console.error('Erreur chargement examens:', error);
        setTokenValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadExamens();
  }, [token]);

  // Charger les personnes aidantes pour l'examen sélectionné
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

    setIsSaving(true);
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

      // Mettre à jour l'examen
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

      // Mettre à jour l'état local
      setExamens(prev => prev.map(e => 
        e.id === selectedExamen.id 
          ? { ...e, besoins_confirmes_par_enseignant: true, surveillants_a_attribuer: surveillantsRestants }
          : e
      ));
      
      setSelectedExamen(prev => prev ? { ...prev, besoins_confirmes_par_enseignant: true } : null);

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
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Confirmation des besoins en surveillance</span>
          </CardTitle>
          <CardDescription>
            Vos examens - Veuillez confirmer les personnes qui vous aideront pour ajuster les besoins en surveillants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {examens.map((examen) => (
              <Card 
                key={examen.id} 
                className={`cursor-pointer border-2 ${
                  selectedExamen?.id === examen.id ? 'border-blue-500' : 'border-gray-200'
                } ${examen.besoins_confirmes_par_enseignant ? 'bg-green-50' : ''}`}
                onClick={() => setSelectedExamen(examen)}
              >
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium">{examen.code_examen}</h3>
                        {examen.besoins_confirmes_par_enseignant && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{examen.matiere}</p>
                      <p className="text-xs text-gray-500">
                        {examen.date_examen} • {examen.heure_debut}-{examen.heure_fin} • {examen.salle}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={examen.besoins_confirmes_par_enseignant ? "default" : "secondary"}>
                        {examen.besoins_confirmes_par_enseignant ? "Confirmé" : "À traiter"}
                      </Badge>
                      <div className="text-sm mt-1">
                        <strong>Surveillants:</strong> {examen.nombre_surveillants}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedExamen && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedExamen.code_examen} - {selectedExamen.matiere}</CardTitle>
            <CardDescription>
              {selectedExamen.date_examen} • {selectedExamen.heure_debut}-{selectedExamen.heure_fin} • {selectedExamen.salle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <Button onClick={sauvegarder} disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Enregistrement..." : "Confirmer et enregistrer"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnseignantToken;
