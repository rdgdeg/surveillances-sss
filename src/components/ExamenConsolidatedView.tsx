
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Users, CheckCircle, MapPin, Search, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";

interface ExamenConsolide {
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  auditoires: Array<{
    salle: string;
    nombre_surveillants: number;
    examen_id: string;
  }>;
  total_surveillants: number;
  nombre_auditoires: number;
  statut_validation: string;
  peut_etre_valide: boolean;
}

export const ExamenConsolidatedView = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamens, setSelectedExamens] = useState<Set<string>>(new Set());

  const { data: examensConsolides, isLoading } = useQuery({
    queryKey: ['examens-consolides', activeSession?.id],
    queryFn: async (): Promise<ExamenConsolide[]> => {
      if (!activeSession?.id) return [];

      const { data: examens, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true })
        .order('code_examen', { ascending: true });

      if (error) throw error;

      // Grouper les examens par code/date/heure
      const groupes = new Map<string, ExamenConsolide>();

      examens.forEach(examen => {
        const cle = `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}`;
        
        if (groupes.has(cle)) {
          const groupe = groupes.get(cle)!;
          groupe.auditoires.push({
            salle: examen.salle,
            nombre_surveillants: examen.nombre_surveillants,
            examen_id: examen.id
          });
          groupe.total_surveillants += examen.nombre_surveillants;
          groupe.nombre_auditoires++;
          
          // Un examen peut être validé seulement si tous ses sous-examens le sont
          if (examen.statut_validation !== 'VALIDE') {
            groupe.peut_etre_valide = false;
          }
        } else {
          groupes.set(cle, {
            code_examen: examen.code_examen || '',
            matiere: examen.matiere,
            date_examen: examen.date_examen,
            heure_debut: examen.heure_debut,
            heure_fin: examen.heure_fin,
            auditoires: [{
              salle: examen.salle,
              nombre_surveillants: examen.nombre_surveillants,
              examen_id: examen.id
            }],
            total_surveillants: examen.nombre_surveillants,
            nombre_auditoires: 1,
            statut_validation: examen.statut_validation || 'NON_TRAITE',
            peut_etre_valide: examen.statut_validation === 'VALIDE'
          });
        }
      });

      return Array.from(groupes.values());
    },
    enabled: !!activeSession?.id
  });

  const validateExamensMutation = useMutation({
    mutationFn: async (examensToValidate: ExamenConsolide[]) => {
      const examenIds = examensToValidate.flatMap(examen => 
        examen.auditoires.map(aud => aud.examen_id)
      );
      
      for (const id of examenIds) {
        const { error } = await supabase
          .from('examens')
          .update({ statut_validation: 'VALIDE' })
          .eq('id', id);

        if (error) throw error;
      }
    },
    onSuccess: (_, examens) => {
      queryClient.invalidateQueries({ queryKey: ['examens-consolides'] });
      setSelectedExamens(new Set());
      toast({
        title: "Examens validés",
        description: `${examens.length} examen(s) consolidé(s) ont été validés.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de validation",
        description: error.message || "Impossible de valider les examens.",
        variant: "destructive"
      });
    }
  });

  const handleSelectExamen = (examenKey: string, selected: boolean) => {
    const newSelected = new Set(selectedExamens);
    if (selected) {
      newSelected.add(examenKey);
    } else {
      newSelected.delete(examenKey);
    }
    setSelectedExamens(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allKeys = filteredExamens.map(examen => 
        `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}`
      );
      setSelectedExamens(new Set(allKeys));
    } else {
      setSelectedExamens(new Set());
    }
  };

  const handleValidateSelected = () => {
    const examensToValidate = filteredExamens.filter(examen => {
      const key = `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}`;
      return selectedExamens.has(key) && examen.peut_etre_valide;
    });

    if (examensToValidate.length === 0) {
      toast({
        title: "Aucun examen à valider",
        description: "Sélectionnez des examens qui peuvent être validés.",
        variant: "destructive"
      });
      return;
    }

    validateExamensMutation.mutate(examensToValidate);
  };

  const filteredExamens = examensConsolides?.filter(examen => 
    examen.code_examen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examen.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examen.auditoires.some(aud => aud.salle.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Statistiques
  const stats = useMemo(() => {
    if (!examensConsolides) return null;

    const totalExamens = examensConsolides.length;
    const totalAuditoires = examensConsolides.reduce((sum, e) => sum + e.nombre_auditoires, 0);
    const totalSurveillants = examensConsolides.reduce((sum, e) => sum + e.total_surveillants, 0);
    const examensValides = examensConsolides.filter(e => e.peut_etre_valide).length;
    const datesUniques = new Set(examensConsolides.map(e => e.date_examen)).size;

    return {
      totalExamens,
      totalAuditoires,
      totalSurveillants,
      examensValides,
      datesUniques
    };
  }, [examensConsolides]);

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
          <p className="text-center">Consolidation des examens en cours...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5" />
            <span>Vue Consolidée des Examens</span>
          </CardTitle>
          <CardDescription>
            Vue d'ensemble groupée par examen avec tous les auditoires sur une ligne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="font-bold text-blue-600">{stats.totalExamens}</div>
                <div className="text-blue-800 text-sm">Examens consolidés</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="font-bold text-purple-600">{stats.totalAuditoires}</div>
                <div className="text-purple-800 text-sm">Auditoires totaux</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="font-bold text-green-600">{stats.totalSurveillants}</div>
                <div className="text-green-800 text-sm">Surveillants requis</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg text-center">
                <div className="font-bold text-emerald-600">{stats.examensValides}</div>
                <div className="text-emerald-800 text-sm">Validés</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="font-bold text-orange-600">{stats.datesUniques}</div>
                <div className="text-orange-800 text-sm">Jours d'examens</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un examen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {selectedExamens.size > 0 && (
              <Button
                onClick={handleValidateSelected}
                disabled={validateExamensMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider sélection ({selectedExamens.size})
              </Button>
            )}
          </div>

          {/* Tableau consolidé */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedExamens.size === filteredExamens.length && filteredExamens.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Code/Matière</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Auditoires</TableHead>
                  <TableHead>Total Surveillants</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExamens.map((examen) => {
                  const examenKey = `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}`;
                  const isSelected = selectedExamens.has(examenKey);
                  
                  return (
                    <TableRow key={examenKey} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectExamen(examenKey, !!checked)}
                          disabled={!examen.peut_etre_valide}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm font-medium">{examen.code_examen}</div>
                          <div className="text-sm text-gray-600">{examen.matiere}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDateWithDayBelgian(examen.date_examen)}</span>
                          </div>
                          <div className="text-gray-500 mt-1">
                            {examen.heure_debut} - {examen.heure_fin}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <Badge variant="outline">
                              {examen.nombre_auditoires} salle{examen.nombre_auditoires > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600">
                            {examen.auditoires.map((aud, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{aud.salle}</span>
                                <span className="font-mono">{aud.nombre_surveillants}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-lg text-center">
                          {examen.total_surveillants}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          surveillants
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            examen.peut_etre_valide 
                              ? "bg-green-100 text-green-800" 
                              : "bg-orange-100 text-orange-800"
                          }
                        >
                          {examen.peut_etre_valide ? 'Prêt à valider' : 'Nécessite vérification'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredExamens.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun examen trouvé pour cette recherche' : 'Aucun examen consolidé trouvé'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
