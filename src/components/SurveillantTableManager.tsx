
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { UserCheck, UserX, Search, Save, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SurveillantWithSession {
  id: string;
  surveillant_id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  is_active: boolean;
  a_obligations: boolean;
  session_entry_id: string;
}

export const SurveillantTableManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurveillants, setSelectedSurveillants] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, { is_active?: boolean; a_obligations?: boolean }>>(new Map());

  const { data: surveillants = [], isLoading } = useQuery({
    queryKey: ['surveillants-table', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('surveillant_sessions')
        .select(`
          id,
          surveillant_id,
          is_active,
          a_obligations,
          surveillants!inner(nom, prenom, email, type)
        `)
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.surveillant_id,
        session_entry_id: item.id,
        surveillant_id: item.surveillant_id,
        nom: item.surveillants.nom,
        prenom: item.surveillants.prenom,
        email: item.surveillants.email,
        type: item.surveillants.type,
        is_active: item.is_active,
        a_obligations: item.a_obligations
      })) as SurveillantWithSession[];
    },
    enabled: !!activeSession?.id
  });

  const updateSurveillantMutation = useMutation({
    mutationFn: async (updates: { session_entry_id: string; is_active?: boolean; a_obligations?: boolean }[]) => {
      for (const update of updates) {
        const updateData: any = {};
        if (update.is_active !== undefined) updateData.is_active = update.is_active;
        if (update.a_obligations !== undefined) updateData.a_obligations = update.a_obligations;
        
        const { error } = await supabase
          .from('surveillant_sessions')
          .update(updateData)
          .eq('id', update.session_entry_id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-table'] });
      setPendingChanges(new Map());
      setSelectedSurveillants(new Set());
      toast({
        title: "Surveillants mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les surveillants.",
        variant: "destructive"
      });
    }
  });

  const filteredSurveillants = surveillants.filter(s => 
    s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChange = (surveillantId: string, field: 'is_active' | 'a_obligations', value: boolean) => {
    const newChanges = new Map(pendingChanges);
    const existing = newChanges.get(surveillantId) || {};
    newChanges.set(surveillantId, { ...existing, [field]: value });
    setPendingChanges(newChanges);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSurveillants(new Set(filteredSurveillants.map(s => s.id)));
    } else {
      setSelectedSurveillants(new Set());
    }
  };

  const handleSelectSurveillant = (surveillantId: string, checked: boolean) => {
    const newSelected = new Set(selectedSurveillants);
    if (checked) {
      newSelected.add(surveillantId);
    } else {
      newSelected.delete(surveillantId);
    }
    setSelectedSurveillants(newSelected);
  };

  const handleBulkUpdate = (field: 'is_active' | 'a_obligations', value: boolean) => {
    const newChanges = new Map(pendingChanges);
    selectedSurveillants.forEach(id => {
      const existing = newChanges.get(id) || {};
      newChanges.set(id, { ...existing, [field]: value });
    });
    setPendingChanges(newChanges);
  };

  const handleSaveChanges = () => {
    const updates = Array.from(pendingChanges.entries()).map(([surveillantId, changes]) => {
      const surveillant = surveillants.find(s => s.id === surveillantId);
      return {
        session_entry_id: surveillant!.session_entry_id,
        ...changes
      };
    });
    
    if (updates.length > 0) {
      updateSurveillantMutation.mutate(updates);
    }
  };

  const getCurrentValue = (surveillant: SurveillantWithSession, field: 'is_active' | 'a_obligations') => {
    const changes = pendingChanges.get(surveillant.id);
    return changes?.[field] !== undefined ? changes[field]! : surveillant[field];
  };

  const hasChanges = pendingChanges.size > 0;

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Aucune session active sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Gestion des Surveillants (Vue Tableau)</span>
          </span>
          {hasChanges && (
            <Button
              onClick={handleSaveChanges}
              disabled={updateSurveillantMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Sauvegarder ({pendingChanges.size})</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un surveillant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {selectedSurveillants.size > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg flex-wrap gap-2">
            <span className="text-sm font-medium">Actions en masse ({selectedSurveillants.size} sélectionnés) :</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate('is_active', true)}
              className="flex items-center space-x-1"
            >
              <UserCheck className="h-3 w-3" />
              <span>Activer</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate('is_active', false)}
              className="flex items-center space-x-1"
            >
              <UserX className="h-3 w-3" />
              <span>Désactiver</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate('a_obligations', true)}
              className="flex items-center space-x-1"
            >
              <UserCheck className="h-3 w-3" />
              <span>Avec obligations</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate('a_obligations', false)}
              className="flex items-center space-x-1"
            >
              <UserX className="h-3 w-3" />
              <span>Sans obligations</span>
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des surveillants...</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedSurveillants.size === filteredSurveillants.length && filteredSurveillants.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Actif</TableHead>
                  <TableHead className="text-center">Obligations</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveillants.map((surveillant) => {
                  const currentActive = getCurrentValue(surveillant, 'is_active');
                  const currentObligations = getCurrentValue(surveillant, 'a_obligations');
                  const hasChange = pendingChanges.has(surveillant.id);
                  
                  return (
                    <TableRow key={surveillant.id} className={hasChange ? 'bg-yellow-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSurveillants.has(surveillant.id)}
                          onCheckedChange={(checked) => handleSelectSurveillant(surveillant.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{surveillant.nom}</TableCell>
                      <TableCell>{surveillant.prenom}</TableCell>
                      <TableCell>{surveillant.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{surveillant.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={currentActive}
                          onCheckedChange={(checked) => handleChange(surveillant.id, 'is_active', checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={currentObligations}
                          onCheckedChange={(checked) => handleChange(surveillant.id, 'a_obligations', checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {currentActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">Inactif</Badge>
                          )}
                          {currentObligations && (
                            <Badge variant="outline" className="text-orange-600">Obligations</Badge>
                          )}
                          {hasChange && <Badge variant="outline" className="text-blue-600">Modifié</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
