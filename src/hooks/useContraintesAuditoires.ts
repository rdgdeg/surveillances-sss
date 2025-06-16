
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
      
      const map: Record<string, number> = {};
      
      (data || []).forEach((item: { auditoire: string; nombre_surveillants_requis: number }) => {
        const auditoire = item.auditoire.trim();
        // Ajouter plusieurs variations pour améliorer la correspondance
        const variations = [
          auditoire.toLowerCase(), // Version lowercase
          auditoire, // Version originale
          auditoire.toLowerCase().replace(/\s+/g, ''), // Sans espaces
          auditoire.toLowerCase().replace(/\s+/g, ' '), // Espaces normalisés
        ];
        
        variations.forEach(variation => {
          map[variation] = item.nombre_surveillants_requis;
        });
      });
      
      return map;
    }
  });
}
