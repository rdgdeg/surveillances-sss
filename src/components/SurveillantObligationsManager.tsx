
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { UserCheck, UserX, Search, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SurveillantObligation {
  id: string;
  surveillant_id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  a_obligations: boolean;
}

export const SurveillantObligationsManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurveillants, setSelectedSurveillants] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  const { data: surveillants = [], isLoading } = useQuery({
    queryKey: ['surveillants-obligations', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('surveillant_sessions')
        .select(`
          id,
          surveillant_id,
          a_obligations,
          surveillants!inner(nom, prenom, email, type)
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        surveillant_id: item.surveillant_id,
        nom: item.surveillants.nom,
        prenom: item.surveillants.prenom,
        email: item.surveillants.email,
        type: item.surveillants.type,
        a_obligations: item.a_obligations
      })) as SurveillantObligation[];
    },
    enabled: !!activeSession?.id
  });

  const updateObligationsMutation = useMutation({
    mutationFn: async (updates: { id: string; a_obligations: boolean }[]) => {
      // Utiliser une boucle pour mettre à jour chaque enregistrement individuellement
      for (const update of updates) {
        const { error } = await supabase
          .from('surveillant_sessions')
          .update({ a_obligations: update.a_obligations })
          .eq('id', update.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-obligations'] });
      setPendingChanges(new Map());
      setSelectedSurveillants(new Set());
      toast({
        title: "Obligations mises à jour",
        description: "Les obligations de surveillance ont été mises à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les obligations.",
        variant: "destructive"
      });
    }
  });

  const filteredSurveillants = surveillants.filter(s => 
    s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleObligationChange = (surveillantId: string, hasObligations: boolean) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(surveillantId, hasObligations);
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

  const handleBulkUpdate = (hasObligations: boolean) => {
    const newChanges = new Map(pendingChanges);
    selectedSurveillants.forEach(id => {
      newChanges.set(id, hasObligations);
    });
    setPendingChanges(newChanges);
  };

  const handleSaveChanges = () => {
    const updates = Array.from(pendingChanges.entries()).map(([id, a_obligations]) => ({
      id,
      a_obligations
    }));
    
    if (updates.length > 0) {
      updateObligationsMutation.mutate(updates);
    }
  };

  const getCurrentObligationStatus = (surveillant: SurveillantObligation) => {
    return pendingChanges.has(surveillant.id) 
      ? pendingChanges.get(surveillant.id)!
      : surveillant.a_obligations;
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
            <UserCheck className="h-5 w-5" />
            <span>Gestion des Obligations de Surveillance</span>
          </span>
          {hasChanges && (
            <Button
              onClick={handleSaveChanges}
              disabled={updateObligationsMutation.isPending}
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
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">Actions en masse ({selectedSurveillants.size} sélectionnés) :</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate(true)}
              className="flex items-center space-x-1"
            >
              <UserCheck className="h-3 w-3" />
              <span>Avec obligations</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkUpdate(false)}
              className="flex items-center space-x-1"
            >
              <UserX className="h-3 w-3" />
              <span>Sans obligations</span>
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-2 border-b">
            <Checkbox
              checked={selectedSurveillants.size === filteredSurveillants.length && filteredSurveillants.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-medium text-sm">Tout sélectionner ({filteredSurveillants.length})</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des surveillants...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSurveillants.map((surveillant) => {
                const currentStatus = getCurrentObligationStatus(surveillant);
                const hasChange = pendingChanges.has(surveillant.id);
                
                return (
                  <div key={surveillant.id} className={`flex items-center space-x-3 p-3 border rounded-lg ${hasChange ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                    <Checkbox
                      checked={selectedSurveillants.has(surveillant.id)}
                      onCheckedChange={(checked) => handleSelectSurveillant(surveillant.id, checked as boolean)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{surveillant.prenom} {surveillant.nom}</span>
                        <Badge variant="secondary">{surveillant.type}</Badge>
                        {hasChange && <Badge variant="outline" className="text-orange-600">Modifié</Badge>}
                      </div>
                      <div className="text-sm text-gray-600">{surveillant.email}</div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={currentStatus}
                        onCheckedChange={(checked) => handleObligationChange(surveillant.id, checked as boolean)}
                      />
                      <span className="text-sm">
                        {currentStatus ? (
                          <span className="text-green-600 flex items-center space-x-1">
                            <UserCheck className="h-3 w-3" />
                            <span>Avec obligations</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center space-x-1">
                            <UserX className="h-3 w-3" />
                            <span>Sans obligations</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
