import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreneauGenere {
  id: string;
  date_surveillance: string;
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string;
  description: string;
  examens_couverts: Array<{
    id: string;
    code_examen: string;
    matiere: string;
    salle: string;
    heure_debut: string;
    heure_fin: string;
    nombre_surveillants: number;
    surveillants_enseignant?: number;
    surveillants_amenes?: number;
    surveillants_pre_assignes?: number;
  }>;
  nb_examens: number;
  nb_surveillants_requis: number;
  statut: 'GENERE' | 'VALIDE' | 'REJETE';
  is_manual: boolean;
  genere_le: string;
  valide_le?: string;
  valide_par?: string;
  notes_admin?: string;
}

export interface OptimizedCreneauFromGenerated {
  type: 'surveillance';
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_surveillance: string;
  examens: Array<{
    id: string;
    code_examen: string;
    matiere: string;
    salle: string;
    heure_debut: string;
    heure_fin: string;
    nombre_surveillants: number;
    surveillants_enseignant: number;
    surveillants_amenes: number;
    surveillants_pre_assignes: number;
  }>;
}

export const useCreneauxGeneres = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['creneaux-generes', sessionId],
    queryFn: async (): Promise<CreneauGenere[]> => {
      if (!sessionId) return [];
      
      console.log('[useCreneauxGeneres] Fetching creneaux_surveillance_generated for session:', sessionId);
      
      const { data, error } = await supabase
        .from('creneaux_surveillance_generated')
        .select('*')
        .eq('session_id', sessionId)
        .eq('statut', 'VALIDE') // Seuls les créneaux validés
        .eq('is_active', true)
        .order('date_surveillance')
        .order('heure_debut');

      if (error) {
        console.error('[useCreneauxGeneres] Error fetching creneaux:', error);
        throw error;
      }

      console.log('[useCreneauxGeneres] Found validated creneaux:', data?.length || 0);
      
      // Convertir les données avec les bons types
      const typedData: CreneauGenere[] = (data || []).map(item => ({
        id: item.id,
        date_surveillance: item.date_surveillance,
        heure_debut: item.heure_debut,
        heure_fin: item.heure_fin,
        nom_creneau: item.nom_creneau || '',
        description: item.description || '',
        examens_couverts: Array.isArray(item.examens_couverts) ? item.examens_couverts as any[] : [],
        nb_examens: item.nb_examens,
        nb_surveillants_requis: item.nb_surveillants_requis,
        statut: item.statut as 'GENERE' | 'VALIDE' | 'REJETE',
        is_manual: item.is_manual,
        genere_le: item.genere_le,
        valide_le: item.valide_le || undefined,
        valide_par: item.valide_par || undefined,
        notes_admin: item.notes_admin || undefined
      }));
      
      return typedData;
    },
    enabled: !!sessionId
  });
};

// Hook pour convertir les créneaux générés en format compatible avec OptimizedAvailabilityForm
export const useOptimizedCreneauxFromGenerated = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['optimized-creneaux-from-generated', sessionId],
    queryFn: async (): Promise<OptimizedCreneauFromGenerated[]> => {
      if (!sessionId) return [];
      
      console.log('[useOptimizedCreneauxFromGenerated] Converting generated creneaux for session:', sessionId);
      
      const { data, error } = await supabase
        .from('creneaux_surveillance_generated')
        .select('*')
        .eq('session_id', sessionId)
        .eq('statut', 'VALIDE')
        .eq('is_active', true)
        .order('date_surveillance')
        .order('heure_debut');

      if (error) {
        console.error('[useOptimizedCreneauxFromGenerated] Error fetching creneaux:', error);
        throw error;
      }

      console.log('[useOptimizedCreneauxFromGenerated] Found validated creneaux:', data?.length || 0);

      if (!data || data.length === 0) {
        return [];
      }

      // Convertir au format attendu par OptimizedAvailabilityForm
      const optimizedCreneaux: OptimizedCreneauFromGenerated[] = data.map((creneau) => ({
        type: 'surveillance' as const,
        date_examen: creneau.date_surveillance,
        heure_debut: creneau.heure_debut,
        heure_fin: creneau.heure_fin,
        heure_debut_surveillance: creneau.heure_debut,
        examens: Array.isArray(creneau.examens_couverts) ? (creneau.examens_couverts as any[]).map((examen: any) => ({
          id: examen.id,
          code_examen: examen.code_examen || '',
          matiere: examen.matiere || '',
          salle: examen.salle || '',
          heure_debut: examen.heure_debut,
          heure_fin: examen.heure_fin,
          nombre_surveillants: examen.nombre_surveillants || 0,
          surveillants_enseignant: examen.surveillants_enseignant || 0,
          surveillants_amenes: examen.surveillants_amenes || 0,
          surveillants_pre_assignes: examen.surveillants_pre_assignes || 0
        })) : []
      }));

      console.log(`[useOptimizedCreneauxFromGenerated] Converted ${optimizedCreneaux.length} creneaux to optimized format`);
      
      return optimizedCreneaux;
    },
    enabled: !!sessionId
  });
};