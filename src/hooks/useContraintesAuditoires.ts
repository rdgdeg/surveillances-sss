
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContraintesAuditoires() {
  return useQuery({
    queryKey: ["contraintes-auditoires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contraintes_auditoires")
        .select("*")
        .order("auditoire");
      
      if (error) throw error;
      return data || [];
    }
  });
}

// Export a separate hook for the lookup map if needed elsewhere
export function useContraintesAuditoiresMap() {
  return useQuery({
    queryKey: ["contraintes-auditoires-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contraintes_auditoires")
        .select("auditoire, nombre_surveillants_requis");
      if (error) throw error;
      return (data || []).reduce(
        (map: Record<string, number>, curr: { auditoire: string; nombre_surveillants_requis: number }) => {
          map[curr.auditoire.trim().toLowerCase()] = curr.nombre_surveillants_requis;
          return map;
        },
        {}
      );
    }
  });
}
