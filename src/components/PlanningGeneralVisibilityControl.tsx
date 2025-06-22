
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const PlanningGeneralVisibilityControl = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();

  const { data: visibilityStatus, isLoading } = useQuery({
    queryKey: ['planning-visibility', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return null;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('planning_general_visible')
        .eq('id', activeSession.id)
        .single();
      
      if (error) throw error;
      return data.planning_general_visible;
    },
    enabled: !!activeSession?.id
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (visible: boolean) => {
      if (!activeSession?.id) throw new Error('Aucune session active');
      
      const { error } = await supabase
        .from('sessions')
        .update({ planning_general_visible: visible })
        .eq('id', activeSession.id);
      
      if (error) throw error;
    },
    onSuccess: (_, visible) => {
      queryClient.invalidateQueries({ queryKey: ['planning-visibility'] });
      toast({
        title: "Visibilité mise à jour",
        description: `Le planning général est maintenant ${visible ? 'visible' : 'masqué'} au public.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la visibilité.",
        variant: "destructive"
      });
    }
  });

  const handleToggle = (checked: boolean) => {
    updateVisibilityMutation.mutate(checked);
  };

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
        <CardTitle className="flex items-center space-x-2">
          {visibilityStatus ? (
            <Eye className="h-5 w-5 text-green-600" />
          ) : (
            <EyeOff className="h-5 w-5 text-gray-400" />
          )}
          <span>Visibilité du Planning Général</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="planning-visibility"
            checked={visibilityStatus || false}
            onCheckedChange={handleToggle}
            disabled={isLoading || updateVisibilityMutation.isPending}
          />
          <Label htmlFor="planning-visibility">
            {visibilityStatus ? 'Planning visible au public' : 'Planning masqué au public'}
          </Label>
        </div>
        
        <div className="text-sm text-gray-600">
          {visibilityStatus ? (
            <p>✅ Le planning général est actuellement accessible à tous les utilisateurs.</p>
          ) : (
            <p>🔒 Le planning général est actuellement masqué et accessible uniquement aux administrateurs.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
