
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Session {
  id: string;
  name: string;
  year: number;
  period: number;
  is_active: boolean;
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
      
      if (error) {
        console.error('Error fetching sessions:', error);
        throw error;
      }
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
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active session:', error);
        throw error;
      }
      return data as Session | null;
    }
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ year, period }: { year: number; period: number }) => {
      const periodNames = { 1: '01', 6: '06', 9: '09' };
      const name = `${year}_${periodNames[period as keyof typeof periodNames]}`;
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({ name, year, period })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }
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
      console.error('Create session mutation error:', error);
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
      
      if (error) {
        console.error('Error activating session:', error);
        throw error;
      }
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
      console.error('Activate session mutation error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'activer la session.",
        variant: "destructive"
      });
    }
  });
};
