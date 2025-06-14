import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Edit, Save, X, ArrowUpDown } from "lucide-react";
import { SurveillantCreationForm } from "./SurveillantCreationForm";
import { EditableCell } from "./EditableCell";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  telephone_gsm?: string;
  faculte_interdite?: string;
  affectation_fac?: string;
  campus?: string;
  statut: string;
  eft?: number;
}

type SortField = 'nom' | 'prenom' | 'email' | 'type' | 'affectation_fac' | 'campus' | 'statut';
type SortOrder = 'asc' | 'desc';

export const SimpleSurveillantManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editData, setEditData] = useState<Record<string, Partial<Surveillant>>>({});
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedSurveillants, setSelectedSurveillants] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const queryClient = useQueryClient();

  // Charger les surveillants
  const { data: surveillants, isLoading } = useQuery({
    queryKey: ['surveillants-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveillants')
        .select('*')
        .order('nom');

      if (error) throw error;
      return data as Surveillant[];
    }
  });

  // Mutation pour mettre à jour un surveillant
  const updateSurveillantMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Surveillant> }) => {
      const { error } = await supabase
        .from('surveillants')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-simple'] });
      toast({
        title: "Surveillant mis à jour",
        description: "Les modifications ont été sauvegardées.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le surveillant.",
        variant: "destructive"
      });
    }
  });

  // Mutation pour MAJ en lot du statut
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      statut
    }: { ids: string[]; statut: 'actif' | 'inactif' }) => {
      const { error } = await supabase
        .from('surveillants')
        .update({ statut })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-simple'] });
      toast({
        title: "Mise à jour réussie",
        description: "Statut des surveillants mis à jour.",
      });
      setSelectedSurveillants(new Set());
      setSelectAll(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les surveillants.",
        variant: "destructive"
      });
    }
  });

  // Filtrage et tri
  const filteredAndSortedSurvaillants = useMemo(() => {
    if (!surveillants) return [];

    let filtered = surveillants.filter(surveillant =>
      surveillant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surveillant.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (surveillant.affectation_fac?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    return filtered.sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      const comparison = aValue.toString().localeCompare(bValue.toString());
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [surveillants, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const startEditing = (id: string) => {
    setEditingRows(prev => new Set(prev).add(id));
    const surveillant = surveillants?.find(s => s.id === id);
    if (surveillant) {
      setEditData(prev => ({ ...prev, [id]: { ...surveillant } }));
    }
  };

  const cancelEditing = (id: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setEditData(prev => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
  };

  const saveChanges = (id: string) => {
    const updates = editData[id];
    if (updates) {
      updateSurveillantMutation.mutate({ id, updates });
      setEditingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setEditData(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
    }
  };

  const updateField = (id: string, field: keyof Surveillant, value: any) => {
    setEditData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const getFieldValue = (surveillant: Surveillant, field: keyof Surveillant) => {
    return editData[surveillant.id]?.[field] ?? surveillant[field];
  };

  const typeOptions = [
    { value: "Assistant", label: "Assistant" },
    { value: "Doctorant", label: "Doctorant" },
    { value: "PAT", label: "PAT" },
    { value: "PAT FASB", label: "PAT FASB" },
    { value: "Jobiste", label: "Jobiste" },
    { value: "Autre", label: "Autre" }
  ];

  const campusOptions = [
    { value: "Solbosch", label: "Solbosch" },
    { value: "Plaine", label: "Plaine" },
    { value: "Erasme", label: "Erasme" },
    { value: "Autre", label: "Autre" }
  ];

  const statutOptions = [
    { value: "actif", label: "Actif" },
    { value: "inactif", label: "Inactif" }
  ];

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      if (filteredAndSortedSurvaillants.length > 0) {
        setSelectedSurveillants(new Set(filteredAndSortedSurvaillants.map(s => s.id)));
      }
    } else {
      setSelectedSurveillants(new Set());
    }
  };
  const handleSelectSurveillant = (id: string, checked: boolean) => {
    const copy = new Set(selectedSurveillants);
    if (checked) copy.add(id);
    else {
      copy.delete(id);
      setSelectAll(false);
    }
    setSelectedSurveillants(copy);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des surveillants...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Surveillants</CardTitle>
              <CardDescription>
                Gérez les surveillants et leur statut (actif/inactif)
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau surveillant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Actions en masse */}
          {selectedSurveillants.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 px-4 py-2 mb-2 rounded">
              <span className="text-blue-800">
                {selectedSurveillants.size} surveillant(s) sélectionné(s)
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() =>
                    bulkUpdateStatusMutation.mutate({
                      ids: Array.from(selectedSurveillants),
                      statut: 'actif'
                    })
                  }
                  disabled={bulkUpdateStatusMutation.isPending}
                >
                  Activer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    bulkUpdateStatusMutation.mutate({
                      ids: Array.from(selectedSurveillants),
                      statut: 'inactif'
                    })
                  }
                  disabled={bulkUpdateStatusMutation.isPending}
                >
                  Désactiver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSurveillants(new Set());
                    setSelectAll(false);
                  }}
                >
                  Annuler la sélection
                </Button>
              </div>
            </div>
          )}

          {/* Recherche */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, prénom, email, type ou affectation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Tableau */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={e => handleSelectAll(e.target.checked)}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('nom')} className="h-auto p-0">
                      Nom <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('prenom')} className="h-auto p-0">
                      Prénom <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('email')} className="h-auto p-0">
                      Email <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('type')} className="h-auto p-0">
                      Type <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('affectation_fac')} className="h-auto p-0">
                      Affectation <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('campus')} className="h-auto p-0">
                      Campus <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('statut')} className="h-auto p-0">
                      Statut <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSurvaillants.map((surveillant) => {
                  const isEditing = editingRows.has(surveillant.id);
                  return (
                    <TableRow key={surveillant.id} className={selectedSurveillants.has(surveillant.id) ? "bg-blue-50" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedSurveillants.has(surveillant.id)}
                          onChange={e => handleSelectSurveillant(surveillant.id, e.target.checked)}
                          aria-label={`Sélectionner ${surveillant.nom} ${surveillant.prenom}`}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            value={getFieldValue(surveillant, 'nom')}
                            onSave={(value) => updateField(surveillant.id, 'nom', value)}
                          />
                        ) : (
                          surveillant.nom
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            value={getFieldValue(surveillant, 'prenom')}
                            onSave={(value) => updateField(surveillant.id, 'prenom', value)}
                          />
                        ) : (
                          surveillant.prenom
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            value={getFieldValue(surveillant, 'email')}
                            onSave={(value) => updateField(surveillant.id, 'email', value)}
                          />
                        ) : (
                          surveillant.email
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            type="select"
                            value={getFieldValue(surveillant, 'type')}
                            options={typeOptions}
                            onSave={(value) => updateField(surveillant.id, 'type', value)}
                          />
                        ) : (
                          <Badge variant="outline">{surveillant.type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            value={getFieldValue(surveillant, 'affectation_fac')}
                            onSave={(value) => updateField(surveillant.id, 'affectation_fac', value)}
                          />
                        ) : (
                          surveillant.affectation_fac || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            type="select"
                            value={getFieldValue(surveillant, 'campus')}
                            options={campusOptions}
                            onSave={(value) => updateField(surveillant.id, 'campus', value)}
                          />
                        ) : (
                          surveillant.campus || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <EditableCell
                            type="select"
                            value={getFieldValue(surveillant, 'statut')}
                            options={statutOptions}
                            onSave={(value) => updateField(surveillant.id, 'statut', value)}
                          />
                        ) : (
                          <Badge variant={surveillant.statut === 'actif' ? 'default' : 'secondary'}>
                            {surveillant.statut}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => saveChanges(surveillant.id)}
                                disabled={updateSurveillantMutation.isPending}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing(surveillant.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(surveillant.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedSurvaillants.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Aucun surveillant trouvé
            </p>
          )}
        </CardContent>
      </Card>

      <SurveillantCreationForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />
    </div>
  );
};
