import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Search, Users, Calendar, Clock, MapPin, Trash2, ListFilter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export const EnseignantExamenForm = () => {
  // --- ALL HOOKS MUST BE HERE AT THE TOP LEVEL ---

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
  // Nouveaux filtres
  const [faculteFilter, setFaculteFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  const [nombrePersonnes, setNombrePersonnes] = useState(1); // Par défaut 1 personne à ajouter
  const [personnesEquipe, setPersonnesEquipe] = useState([
    { nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true }
  ]);

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

  // Liste unique des facultés disponibles
  const faculteList = useMemo(() => {
    if (!examensValides) return [];
    const uniques = Array.from(new Set(examensValides.map((e: any) => e.faculte).filter(Boolean)));
    return uniques;
  }, [examensValides]);

  // Filtrage de la liste
  const filteredExamens = useMemo(() => {
    if (!examensValides) return [];

    return examensValides.filter((ex: any) => {
      if (faculteFilter && ex.faculte !== faculteFilter) return false;
      if (dateFilter && ex.date_examen !== format(dateFilter, "yyyy-MM-dd")) return false;
      // Ne filtre pas sur code ici (on propose toute la liste)
      return true;
    });
  }, [examensValides, faculteFilter, dateFilter]);

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

  const examenTrouve = useMemo(() => (
    examensValides?.find(e =>
      e.code_examen?.toLowerCase().includes(searchCode.toLowerCase()))
  ), [examensValides, searchCode]);

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

  // Lorsque le nombre change, ajuster la taille du tableau personnesEquipe
  useEffect(() => {
    setPersonnesEquipe(arr => {
      const diff = nombrePersonnes - arr.length;
      if (diff > 0) {
        return [
          ...arr,
          ...Array(diff).fill({ nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true })
        ];
      } else if (diff < 0) {
        return arr.slice(0, nombrePersonnes);
      } else {
        return arr;
      }
    });
  }, [nombrePersonnes]);

  // Nouvelle fonction pour ajouter plusieurs personnes d'un coup
  const handleAjouterPersonnes = () => {
    if (!selectedExamen) return;
    const personnesValides = personnesEquipe.every(p => p.nom && p.prenom);
    if (!personnesValides) {
      toast({
        title: "Champs requis",
        description: "Nom et prénom sont obligatoires pour chaque personne.",
        variant: "destructive"
      });
      return;
    }
    personnesEquipe.forEach((personne) => {
      ajouterPersonneMutation.mutate({
        examenId: selectedExamen.id,
        personne: personne
      });
    });
  };

  // Affichage recap horizontal en flex aligné & style chiffres/color
  const BlocResume = ({ nombre, titre, color }: { nombre: number, titre: string, color: string }) => (
    <div className="flex flex-col items-center justify-center flex-1 py-2">
      <div className={`text-3xl font-bold ${color}`}>{nombre}</div>
      <div className="text-base text-gray-600">{titre}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Rechercher votre examen</span>
          </CardTitle>
          <CardDescription>
            Entrez le code de votre examen ou sélectionnez-le ci-dessous pour renseigner vos besoins de surveillance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-2 space-y-2 md:space-y-0">
            <Input
              placeholder="Code d'examen..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setSelectedExamen(examenTrouve)} disabled={!examenTrouve}>
              Rechercher
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <ListFilter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="space-y-4">
                  <div>
                    <Label>Faculté</Label>
                    <Select value={faculteFilter} onValueChange={setFaculteFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les facultés" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Toutes</SelectItem>
                        {faculteList.map((fac) => (
                          <SelectItem value={fac} key={fac}>
                            {fac}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <ShadcnCalendar
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      className="pointer-events-auto"
                    />
                    {dateFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateFilter(null)}
                        className="mt-1"
                      >
                        Effacer la date
                      </Button>
                    )}
                  </div>
                  {(faculteFilter || dateFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFaculteFilter("");
                        setDateFilter(null);
                      }}
                      className="w-full"
                    >
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {searchCode && !examenTrouve && (
            <p className="text-sm text-red-600">Aucun examen trouvé avec ce code.</p>
          )}

          {/* Liste des examens disponibles filtree */}
          <div className="py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Faculté</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExamens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Aucun examen correspondant</TableCell>
                  </TableRow>
                ) : (
                  filteredExamens.map((ex: any) => (
                    <TableRow key={ex.id} className={selectedExamen && ex.id === selectedExamen.id ? "bg-blue-100/50" : ""}>
                      <TableCell className="font-mono">{ex.code_examen}</TableCell>
                      <TableCell>{ex.matiere}</TableCell>
                      <TableCell>{ex.faculte}</TableCell>
                      <TableCell>{formatDate(ex.date_examen)}</TableCell>
                      <TableCell>{ex.salle}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          variant={selectedExamen && ex.id === selectedExamen.id ? "secondary" : "outline"}
                          onClick={() => setSelectedExamen(ex)}
                        >
                          {selectedExamen && ex.id === selectedExamen.id ? "Sélectionné" : "Choisir"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="text-sm text-gray-600 mt-2">
              {filteredExamens.length} examen{filteredExamens.length > 1 ? "s" : ""} affiché{filteredExamens.length > 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExamen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold">{selectedExamen.code_examen}</span>
                <span className="ml-3">{selectedExamen.matiere}</span>
              </div>
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

            {/* Bloc résumé aligné horizontal */}
            <div className="flex justify-between items-stretch bg-gray-50 rounded-xl px-2 py-2 mb-2">
              <BlocResume
                nombre={selectedExamen.nombre_surveillants}
                titre="Surveillants théoriques"
                color="text-blue-700"
              />
              <BlocResume
                nombre={calculerSurveillantsPedagogiques(selectedExamen)}
                titre="Équipe pédagogique"
                color="text-green-700"
              />
              <BlocResume
                nombre={calculerSurveillantsNecessaires(selectedExamen)}
                titre="Surveillants à attribuer"
                color="text-orange-600"
              />
            </div>

            {/* --- Nouveauté: Encodage équipe pédagogique --- */}
            <div>
              <h4 className="font-medium mb-3">
                Combien de personnes apportez-vous dans votre équipe pédagogique ?
              </h4>
              <div className="w-52">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={nombrePersonnes}
                  onChange={e => setNombrePersonnes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mb-6"
                />
              </div>
              {Array.from({ length: nombrePersonnes }).map((_, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-4 bg-white rounded-lg mb-2 pb-2 border border-gray-100 px-2">
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={personnesEquipe[idx]?.nom || ""}
                      onChange={e => {
                        const v = e.target.value;
                        setPersonnesEquipe(arr => arr.map((pers, i) =>
                          i === idx ? { ...pers, nom: v } : pers
                        ));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Prénom *</Label>
                    <Input
                      value={personnesEquipe[idx]?.prenom || ""}
                      onChange={e => {
                        const v = e.target.value;
                        setPersonnesEquipe(arr => arr.map((pers, i) =>
                          i === idx ? { ...pers, prenom: v } : pers
                        ));
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={personnesEquipe[idx]?.email || ""}
                      onChange={e => {
                        const v = e.target.value;
                        setPersonnesEquipe(arr => arr.map((pers, i) =>
                          i === idx ? { ...pers, email: v } : pers
                        ));
                      }}
                    />
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-6 py-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!personnesEquipe[idx]?.est_assistant}
                        onCheckedChange={checked =>
                          setPersonnesEquipe(arr => arr.map((pers, i) =>
                            i === idx ? { ...pers, est_assistant: !!checked } : pers
                          ))
                        }
                      />
                      <Label>Assistant SSS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={!!personnesEquipe[idx]?.present_sur_place}
                        onCheckedChange={checked =>
                          setPersonnesEquipe(arr => arr.map((pers, i) =>
                            i === idx ? { ...pers, present_sur_place: !!checked, compte_dans_quota: !!checked } : pers
                          ))
                        }
                      />
                      <Label>Sera présent sur place et assurera la surveillance</Label>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                onClick={handleAjouterPersonnes}
                className="w-full bg-uclouvain-blue hover:bg-blue-900"
                disabled={ajouterPersonneMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
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
