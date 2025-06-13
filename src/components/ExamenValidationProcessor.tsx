
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FileSpreadsheet, CheckCircle, AlertTriangle, Clock, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExamenValidation {
  id: string;
  examen_id: string;
  code_original: string;
  type_detecte: string;
  statut_validation: string;
  commentaire: string;
  valide_par: string;
  date_validation: string;
  examen: {
    matiere: string;
    date_examen: string;
    heure_debut: string;
    salle: string;
  };
}

export const ExamenValidationProcessor = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedValidations, setSelectedValidations] = useState<string[]>([]);
  const [validatorName, setValidatorName] = useState("");

  const { data: validations, isLoading } = useQuery({
    queryKey: ['examens-validation', activeSession?.id],
    queryFn: async (): Promise<ExamenValidation[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens_validation')
        .select(`
          *,
          examen:examens(matiere, date_examen, heure_debut, salle)
        `)
        .eq('examens.session_id', activeSession.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const validateExamenMutation = useMutation({
    mutationFn: async ({ validationId, statut, commentaire }: { 
      validationId: string; 
      statut: string; 
      commentaire?: string;
    }) => {
      if (!validatorName.trim()) {
        throw new Error("Veuillez saisir votre nom avant de valider");
      }

      const { error } = await supabase
        .from('examens_validation')
        .update({
          statut_validation: statut,
          commentaire: commentaire || '',
          valide_par: validatorName.trim(),
          date_validation: new Date().toISOString()
        })
        .eq('id', validationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
      setSelectedValidations([]);
      toast({
        title: "Validation mise à jour",
        description: "Le statut de validation a été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la validation.",
        variant: "destructive"
      });
    }
  });

  const batchValidateMutation = useMutation({
    mutationFn: async ({ validationIds, statut }: { 
      validationIds: string[]; 
      statut: string; 
    }) => {
      if (!validatorName.trim()) {
        throw new Error("Veuillez saisir votre nom avant de valider");
      }

      const { error } = await supabase
        .from('examens_validation')
        .update({
          statut_validation: statut,
          valide_par: validatorName.trim(),
          date_validation: new Date().toISOString()
        })
        .in('id', validationIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-validation'] });
      setSelectedValidations([]);
      toast({
        title: "Validation en lot réussie",
        description: `${selectedValidations.length} examens ont été traités.`,
      });
    }
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "VALIDE": return "bg-green-100 text-green-800";
      case "REJETE": return "bg-red-100 text-red-800";
      case "NECESSITE_VALIDATION": return "bg-orange-100 text-orange-800";
      case "EN_ATTENTE": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case "VALIDE": return <CheckCircle className="h-4 w-4" />;
      case "REJETE": return <AlertTriangle className="h-4 w-4" />;
      case "NECESSITE_VALIDATION": return <Clock className="h-4 w-4" />;
      default: return <Filter className="h-4 w-4" />;
    }
  };

  const filteredValidations = validations?.filter(v => 
    filterStatus === "ALL" || v.statut_validation === filterStatus
  ) || [];

  const handleSelectValidation = (validationId: string) => {
    setSelectedValidations(prev => 
      prev.includes(validationId)
        ? prev.filter(id => id !== validationId)
        : [...prev, validationId]
    );
  };

  const handleValidateSelected = (statut: string) => {
    if (selectedValidations.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un examen à valider.",
        variant: "destructive"
      });
      return;
    }

    batchValidateMutation.mutate({ validationIds: selectedValidations, statut });
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
          <p className="text-center">Chargement des validations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Validation des Codes d'Examens</span>
          </CardTitle>
          <CardDescription>
            Gérez la validation automatique et manuelle des codes d'examens importés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contrôles */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium">Nom du validateur</label>
              <input
                type="text"
                value={validatorName}
                onChange={(e) => setValidatorName(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                <SelectItem value="NECESSITE_VALIDATION">Nécessite validation</SelectItem>
                <SelectItem value="VALIDE">Validé</SelectItem>
                <SelectItem value="REJETE">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions en lot */}
          {selectedValidations.length > 0 && (
            <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800 font-medium">
                {selectedValidations.length} sélectionné(s) :
              </span>
              <Button
                size="sm"
                onClick={() => handleValidateSelected("VALIDE")}
                disabled={validateExamenMutation.isPending}
              >
                Valider tous
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleValidateSelected("REJETE")}
                disabled={validateExamenMutation.isPending}
              >
                Rejeter tous
              </Button>
            </div>
          )}

          {/* Tableau des validations */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedValidations.length === filteredValidations.length && filteredValidations.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedValidations(filteredValidations.map(v => v.id));
                        } else {
                          setSelectedValidations([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Code Original</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Type Détecté</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredValidations.map((validation) => (
                  <TableRow 
                    key={validation.id} 
                    className={selectedValidations.includes(validation.id) ? "bg-blue-50" : ""}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedValidations.includes(validation.id)}
                        onChange={() => handleSelectValidation(validation.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {validation.code_original}
                    </TableCell>
                    <TableCell>{validation.examen?.matiere || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{validation.examen?.date_examen}</div>
                        <div className="text-gray-500">{validation.examen?.heure_debut}</div>
                      </div>
                    </TableCell>
                    <TableCell>{validation.examen?.salle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{validation.type_detecte}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(validation.statut_validation)}>
                        {getStatusIcon(validation.statut_validation)}
                        <span className="ml-1">{validation.statut_validation}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <div className="text-sm text-gray-600 truncate">
                        {validation.commentaire}
                      </div>
                    </TableCell>
                    <TableCell>
                      {validation.statut_validation === "NECESSITE_VALIDATION" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => validateExamenMutation.mutate({
                              validationId: validation.id,
                              statut: "VALIDE"
                            })}
                            disabled={validateExamenMutation.isPending}
                          >
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => validateExamenMutation.mutate({
                              validationId: validation.id,
                              statut: "REJETE"
                            })}
                            disabled={validateExamenMutation.isPending}
                          >
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredValidations.length === 0 && (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune validation d'examen trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
