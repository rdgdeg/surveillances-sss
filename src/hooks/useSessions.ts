
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatSession } from "@/utils/sessionUtils";

export interface Session {
  id: string;
  name: string;
  year: number;
  period: number;
  is_active: boolean;
  planning_general_visible: boolean | null;
  created_at: string;
  updated_at: string;
}

export const useSessions = () => {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('year', { ascending: false })
        .order('period', { ascending: false });
      
      if (error) throw error;
      return data as Session[];
    }
  });
};

export const useActiveSession = () => {
  return useQuery({
    queryKey: ['active-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Session | null;
    }
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ year, period }: { year: number; period: number }) => {
      // Nouveau format pour les noms de sessions
      const periodNames = { 
        1: 'Janvier', 
        6: 'Juin', 
        9: 'Septembre' 
      };
      const name = `${year}_${period.toString().padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({ name, year, period })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: "Session créée",
        description: "La nouvelle session a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session.",
        variant: "destructive"
      });
    }
  });
};

export const useActivateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // First deactivate all sessions
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Then activate the selected session
      const { data, error } = await supabase
        .from('sessions')
        .update({ is_active: true })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast({
        title: "Session activée",
        description: "La session a été activée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'activer la session.",
        variant: "destructive"
      });
    }
  });
};

export const useTogglePlanningVisibility = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, visible }: { sessionId: string; visible: boolean }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ planning_general_visible: visible })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast({
        title: variables.visible ? "Planning activé" : "Planning désactivé",
        description: variables.visible 
          ? "Le planning général est maintenant visible pour tous."
          : "Le planning général a été masqué.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la visibilité du planning.",
        variant: "destructive"
      });
    }
  });
};
